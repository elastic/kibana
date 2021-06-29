/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { omit } from 'lodash';
import chalk from 'chalk';
import { KibanaRequest } from '../../../../../../../src/core/server';
import { inspectableEsQueriesMap } from '../../../routes/register_routes';

function formatObj(obj: Record<string, any>) {
  return JSON.stringify(obj, null, 2);
}

export async function callAsyncWithDebug<T>({
  cb,
  getDebugMessage,
  debug,
  request,
  requestType,
  requestParams,
  isCalledWithInternalUser,
}: {
  cb: () => Promise<T>;
  getDebugMessage: () => { body: string; title: string };
  debug: boolean;
  request: KibanaRequest;
  requestType: string;
  requestParams: Record<string, any>;
  isCalledWithInternalUser: boolean; // only allow inspection of queries that were retrieved with credentials of the end user
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
    const duration = Math.round(diff[0] * 1000 + diff[1] / 1e6); // duration in ms

    const { title, body } = getDebugMessage();

    console.log(
      chalk.bold[highlightColor](`=== Debug: ${title} (${duration}ms) ===`)
    );

    console.log(body);
    console.log(`\n`);

    const inspectableEsQueries = inspectableEsQueriesMap.get(request);
    if (!isCalledWithInternalUser && inspectableEsQueries) {
      inspectableEsQueries.push({
        response: res,
        duration,
        requestType,
        requestParams: omit(requestParams, 'headers'),
        esError: esError?.response ?? esError?.message,
      });
    }
  }

  if (esError) {
    throw esError;
  }

  return res;
}

export const getDebugBody = ({
  params,
  requestType,
  operationName,
}: {
  params: Record<string, any>;
  requestType: string;
  operationName: string;
}) => {
  const operationLine = `${operationName}\n`;

  if (requestType === 'search') {
    return `${operationLine}GET ${params.index}/_search\n${formatObj(
      params.body
    )}`;
  }

  return `${chalk.bold('ES operation:')} ${requestType}\n${chalk.bold(
    'ES query:'
  )}\n${operationLine}${formatObj(params)}`;
};

export const getDebugTitle = (request: KibanaRequest) =>
  `${request.route.method.toUpperCase()} ${request.route.path}`;
