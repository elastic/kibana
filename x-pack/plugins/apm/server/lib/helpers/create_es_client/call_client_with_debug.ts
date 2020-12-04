/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import { omit } from 'lodash';
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
  request: KibanaRequest & { _debugQueries?: Array<Record<string, any>> };
}) {
  const startTime = process.hrtime();

  let res: any;
  let esError = undefined as (Error & { response?: unknown }) | undefined;
  try {
    res = await apiCaller(operationName, params);
  } catch (e) {
    // catch error and throw after outputting debug info
    esError = e;
  }

  if (debug) {
    const diff = process.hrtime(startTime);
    const duration = Math.round(diff[0] * 1000 + diff[1] / 1e6);

    outputToConsole({ operationName, params, request, esError, duration });

    // TODO: add check to verify that the user is superuser or equivalent
    const isSuperuser = true;
    if (isSuperuser) {
      request._debugQueries = request._debugQueries ?? [];

      request._debugQueries.push({
        duration,
        operationName,
        params: omit(params, 'headers'),
        esError: esError?.response ?? esError?.message,
      });
    }
  }

  if (esError) {
    throw esError;
  }

  return res;
}

function outputToConsole({
  operationName,
  params,
  request,
  esError,
  duration,
}: {
  operationName: string;
  params: Record<string, any>;
  request: KibanaRequest;
  esError?: Error;
  duration: number;
}): void {
  const highlightColor = esError ? 'bgRed' : 'inverse';
  const routeInfo = `${request.route.method.toUpperCase()} ${
    request.route.path
  }`;

  console.log(
    chalk.bold[highlightColor](`=== Debug: ${routeInfo} (${duration}ms) ===`)
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
