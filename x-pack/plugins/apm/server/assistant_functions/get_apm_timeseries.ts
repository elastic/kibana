/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { FromSchema } from 'json-schema-to-ts';
import { omit } from 'lodash';
import { FunctionRegistrationParameters } from '.';
import {
  ApmTimeseries,
  getApmTimeseries,
} from '../routes/assistant_functions/get_apm_timeseries';
import { NON_EMPTY_STRING } from '../utils/non_empty_string_ref';

const parameters = {
  type: 'object',
  properties: {
    start: {
      type: 'string',
      description:
        'The start of the time range, in Elasticsearch date math, like `now`.',
    },
    end: {
      type: 'string',
      description:
        'The end of the time range, in Elasticsearch date math, like `now-24h`.',
    },
    stats: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          timeseries: {
            description: 'The metric to be displayed',
            oneOf: [
              {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    enum: [
                      'transaction_throughput',
                      'transaction_failure_rate',
                    ],
                  },
                  'transaction.type': {
                    type: 'string',
                    description: 'The transaction type',
                  },
                },
                required: ['name'],
              },
              {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    enum: [
                      'exit_span_throughput',
                      'exit_span_failure_rate',
                      'exit_span_latency',
                    ],
                  },
                  'span.destination.service.resource': {
                    type: 'string',
                    description:
                      'The name of the downstream dependency for the service',
                  },
                },
                required: ['name'],
              },
              {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    const: 'error_event_rate',
                  },
                },
                required: ['name'],
              },
              {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    const: 'transaction_latency',
                  },
                  'transaction.type': {
                    type: 'string',
                  },
                  function: {
                    type: 'string',
                    enum: ['avg', 'p95', 'p99'],
                  },
                },
                required: ['name', 'function'],
              },
            ],
          },
          'service.name': {
            ...NON_EMPTY_STRING,
            description: 'The name of the service',
          },
          'service.environment': {
            description:
              'The environment that the service is running in. If undefined, all environments will be included. Only use this if you have confirmed the environment that the service is running in.',
          },
          filter: {
            type: 'string',
            description:
              'a KQL query to filter the data by. If no filter should be applied, leave it empty.',
          },
          title: {
            type: 'string',
            description:
              'A unique, human readable, concise title for this specific group series.',
          },
          offset: {
            type: 'string',
            description:
              'The offset. Right: 15m. 8h. 1d. Wrong: -15m. -8h. -1d.',
          },
        },
        required: ['service.name', 'timeseries', 'title'],
      },
    },
  },
  required: ['stats', 'start', 'end'],
} as const;

export function registerGetApmTimeseriesFunction({
  apmEventClient,
  registerFunction,
}: FunctionRegistrationParameters) {
  registerFunction(
    {
      contexts: ['apm'],
      name: 'get_apm_timeseries',
      descriptionForUser: i18n.translate(
        'xpack.apm.observabilityAiAssistant.functions.registerGetApmTimeseries.descriptionForUser',
        {
          defaultMessage: `Display different APM metrics, like throughput, failure rate, or latency, for any service or all services, or any or all of its dependencies, both as a timeseries and as a single statistic. Additionally, the function will return any changes, such as spikes, step and trend changes, or dips. You can also use it to compare data by requesting two different time ranges, or for instance two different service versions`,
        }
      ),
      description: `Visualise and analyse different APM metrics, like throughput, failure rate, or latency, for any service or all services, or any or all of its dependencies, both as a timeseries and as a single statistic. A visualisation will be displayed above your reply - DO NOT attempt to display or generate an image yourself, or any other placeholder. Additionally, the function will return any changes, such as spikes, step and trend changes, or dips. You can also use it to compare data by requesting two different time ranges, or for instance two different service versions.`,
      parameters,
    },
    async (
      { arguments: args },
      signal
    ): Promise<GetApmTimeseriesFunctionResponse> => {
      const timeseries = await getApmTimeseries({
        apmEventClient,
        arguments: args as any,
      });

      return {
        content: timeseries.map(
          (series): Omit<ApmTimeseries, 'data'> => omit(series, 'data')
        ),
        data: timeseries,
      };
    }
  );
}

export type GetApmTimeseriesFunctionArguments = FromSchema<typeof parameters>;
export interface GetApmTimeseriesFunctionResponse {
  content: Array<Omit<ApmTimeseries, 'data'>>;
  data: ApmTimeseries[];
}
