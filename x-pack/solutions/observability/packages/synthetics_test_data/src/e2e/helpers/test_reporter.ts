/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey, Step } from '@elastic/synthetics/dist/dsl';
import { Reporter, ReporterOptions } from '@elastic/synthetics';
import {
  JourneyEndResult,
  JourneyStartResult,
  StepEndResult,
} from '@elastic/synthetics/dist/common_types';

import { yellow, green, cyan, red, bold } from 'chalk';

// eslint-disable-next-line no-console
const log = console.log;

import { performance } from 'perf_hooks';
import * as fs from 'fs';
import { gatherScreenshots } from '@elastic/synthetics/dist/reporters/json';
import { CACHE_PATH } from '@elastic/synthetics/dist/helpers';
import { join } from 'path';

function renderError(error: any) {
  let output = '';
  const outer = indent('');
  const inner = indent(outer);
  const container = outer + '---\n';
  output += container;
  let stack = error.stack;
  if (stack) {
    output += inner + 'stack: |-\n';
    stack = rewriteErrorStack(stack, findPWLogsIndexes(stack));
    const lines = String(stack).split('\n');
    for (const line of lines) {
      output += inner + '  ' + line + '\n';
    }
  }
  output += container;
  return red(output);
}

function renderDuration(durationMs: number) {
  return Number(durationMs).toFixed(0);
}

export class TestReporter implements Reporter {
  metrics = {
    succeeded: 0,
    failed: 0,
    skipped: 0,
  };

  journeys: Map<string, Array<StepEndResult & { name: string }>> = new Map();

  constructor(options: ReporterOptions = {}) {}

  onJourneyStart(journey: Journey, {}: JourneyStartResult) {
    if (process.env.CI) {
      this.write(`\n--- Journey: ${journey.name}`);
    } else {
      this.write(bold(`\n Journey: ${journey.name}`));
    }
  }

  onStepEnd(journey: Journey, step: Step, result: StepEndResult) {
    const { status, end, start, error } = result;
    const message = `${symbols[status]}  Step: '${step.name}' ${status} (${renderDuration(
      (end - start) * 1000
    )} ms)`;
    this.write(indent(message));
    if (error) {
      this.write(renderError(error));
    }
    this.metrics[status]++;
    if (!this.journeys.has(journey.name)) {
      this.journeys.set(journey.name, []);
    }
    this.journeys.get(journey.name)?.push({ name: step.name, ...result });
  }

  async onJourneyEnd(journey: Journey, { error, start, end, status }: JourneyEndResult) {
    const { failed, succeeded, skipped } = this.metrics;
    const total = failed + succeeded + skipped;
    if (total === 0 && error) {
      this.write(renderError(error));
    }
    const message = `${symbols[status]} Took  (${renderDuration(end - start)} seconds)`;
    this.write(message);

    await fs.promises.mkdir('.journeys/failed_steps', { recursive: true });

    await gatherScreenshots(join(CACHE_PATH, 'screenshots'), async (screenshot) => {
      const { data, step } = screenshot;

      if (status === 'failed') {
        await (async () => {
          await fs.promises.writeFile(join('.journeys/failed_steps/', `${step.name}.jpg`), data, {
            encoding: 'base64',
          });
        })();
      }
    });
  }

  onEnd() {
    const failedJourneys = Array.from(this.journeys.entries()).filter(([, steps]) =>
      steps.some((step) => step.status === 'failed')
    );

    if (failedJourneys.length > 0) {
      failedJourneys.forEach(([journeyName, steps]) => {
        if (process.env.CI) {
          const name = red(`Journey: ${journeyName} 🥵`);
          this.write(`\n+++ ${name}`);
          steps.forEach((stepResult) => {
            const { status, end, start, error, name: stepName } = stepResult;
            const message = `${symbols[status]}  Step: '${stepName}' ${status} (${renderDuration(
              (end - start) * 1000
            )} ms)`;
            this.write(indent(message));
            if (error) {
              this.write(renderError(error));
            }
          });
        }
      });
    }

    const successfulJourneys = Array.from(this.journeys.entries()).filter(([, steps]) =>
      steps.every((step) => step.status === 'succeeded')
    );

    successfulJourneys.forEach(([journeyName, steps]) => {
      try {
        fs.unlinkSync('.journeys/videos/' + journeyName + '.webm');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(
          'Failed to delete video file for path ' + '.journeys/videos/' + journeyName + '.webm'
        );
      }
    });

    const { failed, succeeded, skipped } = this.metrics;
    const total = failed + succeeded + skipped;

    let message = '\n';
    if (total === 0) {
      message = 'No tests found!';
      message += ` (${renderDuration(now())} ms) \n`;
      this.write(message);
      return;
    }

    message += succeeded > 0 ? green(` ${succeeded} passed`) : '';
    message += failed > 0 ? red(` ${failed} failed`) : '';
    message += skipped > 0 ? cyan(` ${skipped} skipped`) : '';
    message += ` (${renderDuration(now() / 1000)} seconds) \n`;
    this.write(message);
  }

  write(message: any) {
    if (typeof message === 'object') {
      message = JSON.stringify(message);
    }
    log(message + '\n');
  }
}

const SEPARATOR = '\n';

function indent(lines: string, tab = '   ') {
  return lines.replace(/^/gm, tab);
}

const NO_UTF8_SUPPORT = process.platform === 'win32';
const symbols = {
  warning: yellow(NO_UTF8_SUPPORT ? '!' : '⚠'),
  skipped: cyan('-'),
  progress: cyan('>'),
  succeeded: green(NO_UTF8_SUPPORT ? 'ok' : '✓'),
  failed: red(NO_UTF8_SUPPORT ? 'x' : '✖'),
};

function now() {
  return performance.now();
}

function findPWLogsIndexes(msgOrStack: string): [number, number] {
  let startIndex = 0;
  let endIndex = 0;
  if (!msgOrStack) {
    return [startIndex, endIndex];
  }
  const lines = String(msgOrStack).split(SEPARATOR);
  const logStart = /[=]{3,} logs [=]{3,}/;
  const logEnd = /[=]{10,}/;
  lines.forEach((line, index) => {
    if (logStart.test(line)) {
      startIndex = index;
    } else if (logEnd.test(line)) {
      endIndex = index;
    }
  });
  return [startIndex, endIndex];
}

function rewriteErrorStack(stack: string, indexes: [number, number]) {
  const [start, end] = indexes;
  /**
   * Do not rewrite if its not a playwright error
   */
  if (start === 0 && end === 0) {
    return stack;
  }
  const linesToKeep = start + 3;
  if (start > 0 && linesToKeep < end) {
    const lines = stack.split(SEPARATOR);
    return lines
      .slice(0, linesToKeep)
      .concat(...lines.slice(end))
      .join(SEPARATOR);
  }
  return stack;
}
