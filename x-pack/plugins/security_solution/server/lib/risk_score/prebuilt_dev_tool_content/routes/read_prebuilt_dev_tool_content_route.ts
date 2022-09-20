/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import mustache from 'mustache';
import path, { join, resolve } from 'path';
import fs from 'fs';

import { transformError } from '@kbn/securitysolution-es-utils';
import type { CustomHttpResponseOptions, KibanaResponseFactory } from '@kbn/core/server';
import { DEV_TOOL_PREBUILT_CONTENT } from '../../../../../common/constants';

import type { SecuritySolutionPluginRouter } from '../../../../types';
import { consoleMappings } from '../console_mappings';
import { ReadConsoleRequestSchema } from '../schema';

import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { getView } from '../utils';

const getReadables = (dataPath: string) => fs.promises.readFile(dataPath, { encoding: 'utf-8' });

class ConsoleResponseFactory {
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

const buildConsoleResponse = (response: KibanaResponseFactory) =>
  new ConsoleResponseFactory(response);

export const readPrebuiltDevToolContentRoute = (router: SecuritySolutionPluginRouter) => {
  router.get(
    {
      path: DEV_TOOL_PREBUILT_CONTENT,
      validate: ReadConsoleRequestSchema,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildConsoleResponse(response);
      const { console_id: consoleId } = request.params;

      try {
        const securitySolution = await context.securitySolution;
        const spaceId = securitySolution.getSpaceId();

        const fileName = consoleMappings[consoleId] ?? null;

        if (!fileName) {
          return siemResponse.error({ statusCode: 500, body: 'No such file or directory' });
        }

        const filePath = '../console_templates';
        const dir = resolve(join(__dirname, filePath));

        const dataPath = path.join(dir, fileName);
        const template = await getReadables(dataPath);

        const riskScoreEntity =
          consoleId === 'enable_host_risk_score' ? RiskScoreEntity.host : RiskScoreEntity.user;
        const view = getView({ spaceId, riskScoreEntity });

        // override the mustache.js escape function to not escape special characters
        mustache.escape = (text) => text;
        const output = mustache.render(template, view);
        return response.ok({ body: output });
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
