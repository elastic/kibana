/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path, { join, resolve } from 'path';
import fs from 'fs';

import { transformError } from '@kbn/securitysolution-es-utils';
import {
  CustomHttpResponseOptions,
  KibanaResponseFactory,
} from '../../../../../../src/core/server';
import { DEV_TOOL_CONSOLE } from '../../../common/constants';

import { SecuritySolutionPluginRouter } from '../../types';

export const getReadables = (dataPath: string): Promise<string> =>
  new Promise((resolved, reject) => {
    let contents = '';
    const readable = fs.createReadStream(dataPath, { encoding: 'utf-8' });

    readable.on('data', (stream) => {
      contents += stream;
    });

    readable.on('end', () => {
      resolved(contents);
    });

    readable.on('error', (err) => {
      reject(err);
    });
  });

export class ConsoleResponseFactory {
  constructor(private response: KibanaResponseFactory) {}

  error<T>({ statusCode, body, headers }: CustomHttpResponseOptions<T>) {
    const contentType: CustomHttpResponseOptions<T>['headers'] = {
      'content-type': 'text/plain; charset=utf-8',
    };
    const defaultedHeaders: CustomHttpResponseOptions<T>['headers'] = {
      ...contentType,
      ...(headers ?? {}),
    };

    return this.response.custom({
      headers: defaultedHeaders,
      statusCode,
      body,
    });
  }
}

export const buildConsoleResponse = (response: KibanaResponseFactory) =>
  new ConsoleResponseFactory(response);

export const readConsoleRoute = (router: SecuritySolutionPluginRouter) => {
  router.get(
    {
      path: DEV_TOOL_CONSOLE,
      validate: false,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildConsoleResponse(response);
      const rulesClient = context.alerting?.getRulesClient();

      if (!rulesClient) {
        return siemResponse.error({ statusCode: 404 });
      }
      const fileName = 'test.console';
      const filePath = './';
      const dir = resolve(
        join(__dirname, filePath ?? '../../../../detection_engine/rules/prepackaged_timelines')
      );
      const file = fileName ?? 'index.ndjson';
      const dataPath = path.join(dir, file);
      let res = '';
      try {
        res = await getReadables(dataPath);
        const regex = /{{space_name}}/g;
        return response.ok({ body: res.replace(regex, 'MySpaceName') });
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
