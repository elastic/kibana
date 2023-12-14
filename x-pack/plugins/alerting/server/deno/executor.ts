/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pidusage from 'pidusage';
import { promisify } from 'util';
import fs from 'fs';
import ChildProcess from 'child_process';
import { Logger } from '@kbn/core/server';
const readFile = promisify(fs.readFile);

export interface ExecuteUserDefinedCodeOpts {
  logger: Logger;
  userDefinedCode: string;
  env: NodeJS.ProcessEnv;
  abortController?: AbortController;
}

// Cache the promise result so we only read once
const childProcessTemplatePromise = readFile(`${__dirname}/child_process_template.tplt`, 'utf8');

export const executeUserDefinedCode = async ({
  logger,
  userDefinedCode,
  env,
  abortController,
}: ExecuteUserDefinedCodeOpts) => {
  // Wrap customCode with our own code file to provide utilities
  const wrappedCode = await wrapUserDefinedCode(userDefinedCode);

  // Run code in child process
  try {
    const { stdout, stderr, duration, ...result } = await new Promise((resolve, reject) => {
      let intervalId: NodeJS.Timeout | null = null;
      const memoryUsageSamples: number[] = [];
      const cpuUsageSamples: number[] = [];
      const start = Date.now();
      const childProcess = ChildProcess.exec(
        `deno run --allow-net=127.0.0.1:9200 --allow-env --allow-sys --no-prompt -`,
        {
          cwd: __dirname,
          ...(abortController ? { signal: abortController.signal } : {}),
          env,
        },
        (err, stdoutResult, stderrResult) => {
          const end = Date.now();
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          if (err) {
            return reject(stderrResult ? new Error(stderrResult) : err);
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
      childProcess.stdin?.write(wrappedCode);
      childProcess.stdin?.end();
      intervalId = setInterval(() => {
        pidusage(childProcess.pid!, (err, stats) => {
          if (!err) {
            cpuUsageSamples.push(stats.cpu);
            memoryUsageSamples.push(stats.memory);
          }
        });
      }, 1);
    });

    if (stderr) {
      throw new Error(stderr);
    }

    return { stdout, cpuUsage: result.cpuUsage, memoryUsage: result.memoryUsage };
  } catch (error) {
    logger.error(`Error executing user-defined code - ${error.message}`);
    throw error;
  }
};

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

function calculatePercentile(array: number[], percentile: number) {
  const sortedArray = array.slice().sort();
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[index];
}
