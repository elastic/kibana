/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FromSchema } from 'json-schema-to-ts';
import { FunctionVisibility } from '@kbn/observability-ai-assistant-plugin/common';
import type { Logger } from '@kbn/logging';
import { Environment } from '../../common/environment_rt';
import { FunctionRegistrationParameters } from '.';
import type { APMConfig } from '..';
import {
  type ApmTraceWaterfall,
  getApmTraceWaterfall,
} from '../routes/assistant_functions/get_apm_trace_waterfall';

const parameters = {
  type: 'object',
  properties: {
    start: {
      type: 'string',
      description: 'The start of the time range, in Elasticsearch date math, like `now-24h`.',
    },
    end: {
      type: 'string',
      description: 'The end of the time range, in Elasticsearch date math, like `now`.',
    },
    'service.environment': {
      type: 'string',
      description:
        'The environment that the service is running in. Leave empty to query for all environments.',
    },
    filter: {
      type: 'string',
      description:
        'a KQL query to filter the data by. If no filter should be applied, leave it empty.',
    },
    // traceParams: {
    //   description: 'The filter to be applied',
    //   oneOf: [
    //     {
    //       type: 'object',
    //       properties: {
    //         'service.name': {
    //           type: 'string',
    //           description: 'The name of the service',
    //         },
    //       },
    //       required: ['service.name'],
    //     },
    //     {
    //       type: 'object',
    //       properties: {
    //         traceId: {
    //           type: 'string',
    //           description: 'The trace ID',
    //         },
    //       },
    //       required: ['traceId'],
    //     },
    //     {
    //       type: 'object',
    //       properties: {
    //         transactionId: {
    //           type: 'string',
    //           description: 'The transaction ID',
    //         },
    //       },
    //       required: ['transactionId'],
    //     },
    //     {
    //       type: 'object',
    //       properties: {
    //         transactionName: {
    //           type: 'string',
    //           description: 'The transaction name',
    //         },
    //       },
    //       required: ['transactionName'],
    //     },
    //     {
    //       type: 'object',
    //       properties: {
    //         filter: {
    //           type: 'string',
    //           description:
    //             'a KQL query to filter the data by. If no filter should be applied, leave it empty.',
    //         },

    //         required: ['filter'],
    //       },
    //     },
    //   ],
    // },
  },
  required: ['start', 'end', 'filter'],
} as const;

interface TraceWaterfallFunctionRegistrationParams extends FunctionRegistrationParameters {
  logger: Logger;
  config: APMConfig;
}

export function registerGetApmTraceWaterfallFunction({
  apmEventClient,
  logger,
  config,
  registerFunction,
}: TraceWaterfallFunctionRegistrationParams) {
  registerFunction(
    {
      name: 'get_apm_trace_waterfall',
      description: `Use this function to show a visualization of distributed traces for any services, transactions, or trace IDs.
        Your ONLY job is to analyze the entire content and provide insights of bottlenecks and points that require attention.
        IMPORTANT: Users DO NOT need to see an ASCII representation of the trace. DO NOT UNDER ANY CIRCUMSTANCES display or render an ASCII trace waterfall, any ASCII visual representations, any code blocks, nor the listed sequence of operations in your response.
     `,
      parameters,
      // deprecated
      visibility: FunctionVisibility.AssistantOnly,
    },
    async ({ arguments: args }, signal): Promise<GetApmTraceWaterfallFunctionResponse> => {
      const waterfall = await getApmTraceWaterfall({
        apmEventClient,
        logger,
        config,
        arguments: {
          ...args,
          'service.environment': args['service.environment'] as Environment | undefined,
        },
      });

      return {
        content: {
          start: waterfall.start,
          end: waterfall.end,
          ascii: waterfall.ascii,
        },
        data: waterfall.data,
      };
    }
  );
}

export type GetApmTraceWaterfallFunctionArguments = FromSchema<typeof parameters>;
export interface GetApmTraceWaterfallFunctionResponse {
  content: Omit<ApmTraceWaterfall, 'data' | 'environment'> & { ascii: string };
  data: ApmTraceWaterfall['data'];
}
