/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import chalk from 'chalk';
import { KibanaRequest } from '../../../../../../../src/core/server';

function formatObj(obj: Record<string, any>) {
  return JSON.stringify(obj, null, 2);
}

export async function callAsyncWithDebug<T>({
  cb,
  getDebugMessage,
  debug,
}: {
  cb: () => Promise<T>;
  getDebugMessage: () => { body: string; title: string };
  debug: boolean;
}) {
  if (!debug) {
    return cb();
  }

  const startTime = process.hrtime();

  let res: any;
  let esError = null;
  try {
    res = await cb();
  } catch (e) {
    // catch error and throw after outputting debug info
    esError = e;
  }

  if (debug) {
    const highlightColor = esError ? 'bgRed' : 'inverse';
    const diff = process.hrtime(startTime);
    const duration = `${Math.round(diff[0] * 1000 + diff[1] / 1e6)}ms`;

    const { title, body } = getDebugMessage();

    console.log(
      chalk.bold[highlightColor](`=== Debug: ${title} (${duration}) ===`)
    );

    console.log(body);
    console.log(`\n`);
  }

  if (esError) {
    throw esError;
  }

  return res;
}

export const getDebugBody = (
  params: Record<string, any>,
  operationName: string
) => {
  if (operationName === 'search') {
    return `GET ${params.index}/_search\n${formatObj(params.body)}`;
  }

  return `${chalk.bold('ES operation:')} ${operationName}\n${chalk.bold(
    'ES query:'
  )}\n${formatObj(params)}`;
};

export const getDebugTitle = (request: KibanaRequest) =>
  `${request.route.method.toUpperCase()} ${request.route.path}`;
