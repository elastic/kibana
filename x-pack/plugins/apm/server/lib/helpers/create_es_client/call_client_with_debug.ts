/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import chalk from 'chalk';
import {
  LegacyAPICaller,
  KibanaRequest,
} from '../../../../../../../src/core/server';

function formatObj(obj: Record<string, any>) {
  return JSON.stringify(obj, null, 2);
}

export async function callClientWithDebug({
  apiCaller,
  operationName,
  params,
  debug,
  request,
}: {
  apiCaller: LegacyAPICaller;
  operationName: string;
  params: Record<string, any>;
  debug: boolean;
  request: KibanaRequest;
}) {
  const startTime = process.hrtime();

  let res: any;
  let esError = null;
  try {
    res = await apiCaller(operationName, params);
  } catch (e) {
    // catch error and throw after outputting debug info
    esError = e;
  }

  if (debug) {
    const highlightColor = esError ? 'bgRed' : 'inverse';
    const diff = process.hrtime(startTime);
    const duration = `${Math.round(diff[0] * 1000 + diff[1] / 1e6)}ms`;
    const routeInfo = `${request.route.method.toUpperCase()} ${
      request.route.path
    }`;

    console.log(
      chalk.bold[highlightColor](`=== Debug: ${routeInfo} (${duration}) ===`)
    );

    if (operationName === 'search') {
      console.log(`GET ${params.index}/_${operationName}`);
      console.log(formatObj(params.body));
    } else {
      console.log(chalk.bold('ES operation:'), operationName);

      console.log(chalk.bold('ES query:'));
      console.log(formatObj(params));
    }
    console.log(`\n`);
  }

  if (esError) {
    throw esError;
  }

  return res;
}
