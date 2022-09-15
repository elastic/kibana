/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Logger } from '@kbn/logging';
import { RouteRegisterParameters } from '.';
import { getRoutePaths } from '../../common';
import {
  createStackFrameMetadata,
  Executable,
  StackFrame,
  StackFrameMetadata,
} from '../../common/profiling';
import { createProfilingEsClient, ProfilingESClient } from '../utils/create_profiling_es_client';
import { mgetStackFrames, mgetExecutables } from './stacktrace';

async function getFrameInformation({
  frameID,
  executableID,
  logger,
  client,
}: {
  frameID: string;
  executableID: string;
  logger: Logger;
  client: ProfilingESClient;
}): Promise<StackFrameMetadata | undefined> {
  const [stackFrames, executables] = await Promise.all([
    mgetStackFrames({
      logger,
      client,
      stackFrameIDs: new Set([frameID]),
    }),
    mgetExecutables({
      logger,
      client,
      executableIDs: new Set([executableID]),
    }),
  ]);

  const frame = Array.from(stackFrames.values())[0] as StackFrame | undefined;
  const executable = Array.from(executables.values())[0] as Executable | undefined;

  if (frame) {
    return createStackFrameMetadata({
      FrameID: frameID,
      FileID: executableID,
      SourceFilename: frame.FileName,
      FunctionName: frame.FunctionName,
      ExeFileName: executable?.FileName,
    });
  }
}

export function registerFrameInformationRoute(params: RouteRegisterParameters) {
  const { logger, router } = params;

  const routePaths = getRoutePaths();

  router.get(
    {
      path: routePaths.FrameInformation,
      validate: {
        query: schema.object({
          frameID: schema.string(),
          executableID: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { frameID, executableID } = request.query;

      const client = createProfilingEsClient({
        request,
        esClient: (await context.core).elasticsearch.client.asCurrentUser,
      });

      try {
        const frame = await getFrameInformation({
          frameID,
          executableID,
          logger,
          client,
        });

        return response.ok({ body: frame });
      } catch (error: any) {
        logger.error(error);
        return response.custom({
          statusCode: error.statusCode ?? 500,
          body: {
            message: error.message ?? 'An internal server error occured',
          },
        });
      }
    }
  );
}
