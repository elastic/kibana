/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pidusage from 'pidusage';
import ChildProcess from 'child_process';
import fetch from 'node-fetch';
import { promisify } from 'util';
import fs from 'fs';
import { RuleExecutorOptions } from '../../types';
import { StackAlertType } from '../types';
import { ActionGroupId, Params } from './rule_type';
const readFile = promisify(fs.readFile);

// Cache the promise result so we only read once
const childProcessTemplatePromise = readFile(`${__dirname}/child_process_template.tplt`, 'utf8');

export async function executor(
  options: RuleExecutorOptions<Params, {}, {}, {}, typeof ActionGroupId, StackAlertType>
) {
  const { apiKey, services, params, logger, queryDelay } = options;
  const { alertsClient, shouldStopExecution } = services;

  if (!apiKey) {
    throw new Error(`User defined rule requires API key to run but none is provided`);
  }

  if (!alertsClient) {
    throw new Error(`Alerts client is not defined`);
  }

  const controller = new AbortController();
  let timeoutId: NodeJS.Timeout | null = null;
  async function checkTimeout() {
    timeoutId = null;

    if (shouldStopExecution()) {
      logger.info(`Aborting exec`);
      controller.abort();
    } else {
      // check again in 30 seconds
      timeoutId = setTimeout(checkTimeout, 30000);
    }
  }
  // Periodically check whether we should continue execution or abort the child
  checkTimeout();

  let userDefinedCode: string;
  const isUrl = params.isUrl;
  if (isUrl) {
    const response = await fetch(params.codeOrUrl);
    userDefinedCode = await response.text();
  } else {
    userDefinedCode = params.codeOrUrl;
  }

  // Wrap customCode with our own code file to provide utilities
  const wrappedCode = await wrapUserDefinedCode(userDefinedCode);

  const alertLimit = alertsClient.getAlertLimitValue();
  let hasReachedLimit = false;

  // Run code in child process
  try {
    const { stdout, stderr, duration, memoryUsage, cpuUsage } = await new Promise(
      (resolve, reject) => {
        let intervalId: NodeJS.Timeout | null = null;
        const memoryUsageSamples: number[] = [];
        const cpuUsageSamples: number[] = [];
        const start = Date.now();
        const childProcess = ChildProcess.exec(
          `cat <<'EOF' | deno run --allow-net=127.0.0.1:9200 --allow-env --allow-sys --no-prompt - \n${wrappedCode}\nEOF`,
          {
            cwd: __dirname,
            signal: controller.signal,
            env: {
              PATH: process.env.PATH,
              ELASTICSEARCH_API_KEY: apiKey,
              QUERY_DELAY_MS: queryDelay?.toString(),
            },
          },
          (err, stdoutResult, stderrResult) => {
            const end = Date.now();
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
            if (err) {
              return reject(err);
            }
            resolve({
              stdout: stdoutResult,
              stderr: stderrResult,
              duration: end - start,
              memoryUsage: {
                p50: calculatePercentile(memoryUsageSamples, 50),
                p95: calculatePercentile(memoryUsageSamples, 95),
                p99: calculatePercentile(memoryUsageSamples, 99),
              },
              cpuUsage: {
                p50: calculatePercentile(cpuUsageSamples, 50),
                p95: calculatePercentile(cpuUsageSamples, 95),
                p99: calculatePercentile(cpuUsageSamples, 99),
              },
            });
          }
        );
        intervalId = setInterval(() => {
          pidusage(childProcess.pid!, (err, stats) => {
            if (!err) {
              cpuUsageSamples.push(stats.cpu);
              memoryUsageSamples.push(stats.memory);
            }
          });
        }, 1);
      }
    );

    if (stderr) {
      throw new Error(stderr);
    }

    if (stdout) {
      logger.info(`Info returned from user defined code ${stdout.split('\n')}`);
      logger.info(
        `Stats from running user defined code\nDuration:${duration}\nMemory usage:${JSON.stringify(
          memoryUsage,
          null,
          2
        )}\nCPU usage:${JSON.stringify(cpuUsage, null, 2)}`
      );
      const alertsToCreate: string[] = getDetectedAlerts(stdout);
      let alertCount = 0;
      for (const alertStr of alertsToCreate) {
        if (alertCount++ >= alertLimit) {
          hasReachedLimit = true;
          break;
        }
        try {
          const alert = JSON.parse(alertStr);
          alertsClient.report({
            id: alert.id,
            actionGroup: ActionGroupId,
            state: alert.state,
            context: alert.context,
          });
        } catch (e) {
          logger.warn(`Couldn't parse reported alert ${alertStr}`);
        }
      }

      const { getRecoveredAlerts } = alertsClient;
      for (const recoveredAlert of getRecoveredAlerts()) {
        const alertId = recoveredAlert.alert.getId();
        alertsClient?.setAlertData({
          id: alertId,
          context: {},
        });
      }
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    alertsClient.setAlertLimitReached(hasReachedLimit);
  } catch (error) {
    logger.error(`Error executing user-defined code - ${error.message}`);
    throw error;
  }

  return { state: {} };
}

async function wrapUserDefinedCode(code: string) {
  const template = await childProcessTemplatePromise;
  return template.replace(
    '// INJECT CODE HERE',
    code
      .split('\n')
      .map((s) => `    ${s}`)
      .join('\n')
  );
}

const reportAlertLogPrefix = 'alertsClient:report:';
function getDetectedAlerts(output: string) {
  return output
    .split('\n')
    .filter((str) => str.indexOf(reportAlertLogPrefix) === 0)
    .map((str) => str.substring(reportAlertLogPrefix.length));
}

function calculatePercentile(array: number[], percentile: number) {
  const sortedArray = array.slice().sort();
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[index];
}
