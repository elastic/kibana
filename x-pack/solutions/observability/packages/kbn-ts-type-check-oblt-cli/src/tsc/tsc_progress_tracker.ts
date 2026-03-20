/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SingleBar } from 'cli-progress';
import stripAnsi from 'strip-ansi';

/**
 * Tracks progress of a `tsc --verbose` run by parsing its output line-by-line
 * and driving a `cli-progress` bar.
 *
 * Progress is tracked by counting two kinds of tsc verbose messages:
 *   - "Building project '...'"       (project needs to be compiled)
 *   - "Project '...' is up to date"  (project skipped, already current)
 *
 * The total project count is extracted from the "Projects in this build:"
 * header that tsc prints at the very start of --verbose output.
 *
 * Error and diagnostic lines are buffered and replayed via `printErrors()`
 * after the bar finishes.
 */
export class TscProgressTracker {
  private totalProjects = 0;
  private completedProjects = 0;
  private builtProjects = 0;
  private skippedProjects = 0;
  private errorCount = 0;
  private parsingProjectList = false;
  private barStarted = false;
  private readonly errorLines: string[] = [];
  private readonly startTime = Date.now();
  private timer: ReturnType<typeof setInterval> | null = null;

  private readonly bar = new SingleBar({
    barsize: 30,
    format:
      ' Type checking [{bar}] {value}/{total} projects | {elapsed} | {built} needed to be rechecked | {errors} errors found | Checking {project}',
    hideCursor: true,
    clearOnComplete: true,
  });

  private formatElapsed(): string {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return mins > 0 ? `${mins}m ${secs.toString().padStart(2, '0')}s` : `${secs}s`;
  }

  /** Start the elapsed-time tick so the bar updates even between project completions. */
  start() {
    this.timer = setInterval(() => {
      if (this.barStarted) {
        this.bar.update({ elapsed: this.formatElapsed() });
      }
    }, 1000);
  }

  /** Feed a stdout line from tsc into the tracker. */
  processLine(line: string) {
    const plain = stripAnsi(line);

    // Detect the project list header and count entries.
    // tsc --verbose output starts with:
    //   [HH:MM:SS] Projects in this build:
    //       * path/to/tsconfig.json
    //       * path/to/tsconfig2.json
    //   ...
    if (plain.includes('Projects in this build:')) {
      this.parsingProjectList = true;
      this.totalProjects = 0;
      return;
    }

    if (this.parsingProjectList) {
      if (/^\s+\*\s+/.test(plain)) {
        this.totalProjects++;
        return;
      }
      // First non-"*" line after the header ends the project list.
      this.parsingProjectList = false;

      if (this.totalProjects > 0 && !this.barStarted) {
        this.bar.start(this.totalProjects, 0, {
          elapsed: this.formatElapsed(),
          project: '',
          status: '',
          built: 0,
          skipped: 0,
          errors: 0,
        });
        this.barStarted = true;
      }
    }

    // Track per-project progress.
    const buildingMatch = plain.match(/Building project '([^']+)'/);
    if (buildingMatch) {
      this.completedProjects++;
      this.builtProjects++;
      if (this.barStarted) {
        this.bar.update(this.completedProjects, {
          elapsed: this.formatElapsed(),
          project: extractProjectName(buildingMatch[1]),
          status: 'checking',
          built: this.builtProjects,
          skipped: this.skippedProjects,
        });
      }
      return;
    }

    const upToDateMatch = plain.match(/Project '([^']+)' is up to date/);
    if (upToDateMatch) {
      this.completedProjects++;
      this.skippedProjects++;
      if (this.barStarted) {
        this.bar.update(this.completedProjects, {
          elapsed: this.formatElapsed(),
          project: extractProjectName(upToDateMatch[1]),
          status: 'cache hit - no rebuild needed',
          built: this.builtProjects,
          skipped: this.skippedProjects,
        });
      }
      return;
    }

    // Collect error / diagnostic lines (anything that isn't verbose noise).
    // Skip timestamp-only verbose lines that don't carry useful info.
    const trimmed = plain.trim();
    if (trimmed.length > 0 && !isVerboseNoise(trimmed)) {
      this.errorLines.push(line);
      if (/\berror TS\d+:/.test(plain)) {
        this.errorCount++;
        if (this.barStarted) {
          this.bar.update({ errors: this.errorCount });
        }
      }
    }
  }

  /** Feed a stderr line from tsc into the tracker. */
  addStderrLine(line: string) {
    this.errorLines.push(line);
    const plain = stripAnsi(line);
    if (/\berror TS\d+:/.test(plain)) {
      this.errorCount++;
      if (this.barStarted) {
        this.bar.update({ errors: this.errorCount });
      }
    }
  }

  /** Stop the timer and finalize the progress bar. */
  stop() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.barStarted) {
      this.bar.update(this.totalProjects, { elapsed: this.formatElapsed() });
      this.bar.stop();
    }
  }

  /** Replay any buffered error / diagnostic output to stdout. */
  printErrors() {
    for (const line of this.errorLines) {
      process.stdout.write(line + '\n');
    }
  }

  getSummary() {
    return {
      totalProjects: this.totalProjects,
      completedProjects: this.completedProjects,
      builtProjects: this.builtProjects,
      skippedProjects: this.skippedProjects,
      errorCount: this.errorCount,
      elapsed: this.formatElapsed(),
    };
  }
}

/**
 * Extract a short, human-friendly project name from a tsconfig path.
 *
 * Examples:
 *   "src/platform/packages/shared/kbn-std/tsconfig.type_check.json"  -> "kbn-std"
 *   "x-pack/solutions/observability/plugins/apm/tsconfig.type_check.json" -> "apm"
 *   "tsconfig.type_check.json" -> "tsconfig.type_check.json"
 */
const extractProjectName = (configPath: string): string => {
  const parts = configPath.replace(/\\/g, '/').split('/');
  // The directory immediately before the tsconfig file is the package/plugin name.
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return configPath;
};

/**
 * Returns true for tsc --verbose lines that are informational noise
 * (not errors, not progress). These are suppressed from output.
 */
const isVerboseNoise = (plain: string): boolean => {
  // Timestamp-prefixed verbose messages we want to hide
  if (/^\[?\d{1,2}:\d{2}:\d{2}\s*(AM|PM)?\]?\s/.test(plain)) {
    return true;
  }
  // The "Projects in this build:" header and list items
  if (plain.includes('Projects in this build:') || /^\s+\*\s+/.test(plain)) {
    return true;
  }
  return false;
};
