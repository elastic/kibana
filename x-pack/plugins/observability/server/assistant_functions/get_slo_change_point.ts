/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FromSchema } from 'json-schema-to-ts';
import { DataView } from '@kbn/data-views-plugin/common';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { i18n } from '@kbn/i18n';
import datemath from '@kbn/datemath';
import { FunctionRegistrationParameters } from '.';
// import { ApmDocumentType } from '../../common/document_type';
// import { ENVIRONMENT_ALL } from '../../common/environment_filter_values';
// import { RollupInterval } from '../../common/rollup';
// import { getApmAlertsClient } from '../lib/helpers/get_apm_alerts_client';
// import { getMlClient } from '../lib/helpers/get_ml_client';
// import { getRandomSampler } from '../lib/helpers/get_random_sampler';
// import { getServicesItems } from '../routes/services/get_services/get_services_items';
// import { NON_EMPTY_STRING } from '../utils/non_empty_string_ref';

export interface SLOSourceItem {
  name: string;
  sourceIndex: string;
}

const parameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    'slo.name': {
      type: 'string',
      description: 'Filter the slos by name',
    },
    start: {
      type: 'string',
      description: 'Optional start of the time range, in Elasticsearch date math, like `now`.',
    },
    end: {
      type: 'string',
      description: 'Optional end of the time range, in Elasticsearch date math, like `now-24h`.',
    },
    field: {
      type: 'string',
      description: 'Optional field to look for changes',
    },
    shortWindow: {
      type: 'string',
      description: 'Optional short window for the associated SLO active alert',
    },
    longWindow: {
      type: 'string',
      description: 'Optional long window that triggered SLO active alert',
    },
    'kibana.alert.start': {
      type: 'string',
      description: 'Optional start of an alert associated with the given SLO',
    },
    metricOperation: {
      type: 'string',
      description: `Optional operation to apply to the metric field for analysis. Defaults to 'avg' for average.
        * Average: 'avg'
        * Maximum: 'max'
        * Minimum: 'min
        * Sum: 'sum`,
      items: {
        type: 'string',
        enum: ['avg', 'max', 'min', 'sum'],
      },
    },
  },
  required: ['slo.name'],
} as const;

export function registerGetSLOChangeDetectionFunction({
  sloClient,
  resources,
  registerFunction,
  dataViewsClient,
}: FunctionRegistrationParameters) {
  registerFunction(
    {
      name: 'get_slo_change_point',
      contexts: ['slo'],
      description: `
        Gets the source index and detects changes in the source data for an SLO. 
        
        Visualise changes in the underlying data for a given SLO. A visualisation will be displayed above your reply - DO NOT attempt to display or generate an image yourself, or any other placeholder. Additionally, the function will return any changes, such as spikes, step and trend changes, or dips.
        
        Include the observed period. For example, if the observed period is "24h" the output should be "over the past 24 hours".

        Always include the 'metricOperation' as well, in plain english, before the field names. For example, if the 'metricOperation' is "avg", this is the "average" and applies to all fields.
        Example "average field1, field2, and field3"

        After presenting the user with the change detection data, add a new line and be sure to ask if they want to repeat the analysis
        over a different time period, metric operation, or SLO.
      `,
      descriptionForUser: i18n.translate(
        'xpack.observability.observabilityAiAssistant.functions.registerGetSLOList.descriptionForUser',
        {
          defaultMessage: `Gets the source index and changes in the source data for an SLO.
          `,
        }
      ),
      parameters,
    },
    async ({ arguments: args }, signal) => {
      const {
        'slo.name': name,
        shortWindow,
        longWindow,
        field,
        start,
        end,
        'kibana.alert.start': alertStart,
        metricOperation = 'avg',
      } = args;
      const params = {
        kqlQuery: `slo.name: "${name}*"`,
        sortBy: 'status',
        sortDirection: 'desc',
        page: '1',
        perPage: '25',
      };
      const slos = await sloClient.find.execute(params);
      let absoluteStartTime: string | undefined;

      if (alertStart && longWindow) {
        absoluteStartTime = datemath
          .parse(`now-${longWindow}`, { forceNow: new Date(alertStart) })
          ?.toISOString();
      }
      const esClient = (await resources.context.core).elasticsearch.client.asCurrentUser;

      const mappedItems = slos.results.map((item): SLOSourceItem => {
        return {
          name: item.name,
          sourceIndex: item.indicator.params.index,
        };
      });
      const index = mappedItems[0].sourceIndex;
      let dataView: DataView;

      const dataViewId = (await dataViewsClient.getIdsWithTitle()).find((id) => {
        return id.title === index;
      })?.id;
      if (dataViewId) {
        dataView = await dataViewsClient.get(dataViewId);
      } else {
        dataView = await dataViewsClient.create({
          title: mappedItems[0].sourceIndex,
        });
      }

      const metricFields = dataView.fields
        .getByType('number')
        .filter((f) => f.aggregatable === true)
        .map((f) => f.name);

      const results = await Promise.all(
        metricFields.map((fieldName) =>
          getChangePointForField({
            index: mappedItems[0].sourceIndex,
            field: fieldName,
            esClient,
            start: start || absoluteStartTime || 'now-24h',
            end: end || 'now',
            aggregationType: metricOperation,
          })
        )
      );

      const changes = results.map((result) => ({
        changedAtApproximateTime: result.aggregations?.change_point_request?.bucket?.key,
        typeOfChange: result.aggregations?.change_point_request?.type,
        fieldName: result.fieldName,
      }));

      return {
        content: {
          changes,
          observedPeriodStart: start || absoluteStartTime || 'now-24h',
          observedPeriodEnd: end || 'now',
          metricOperation,
        },
        data: {
          dataView,
        },
      };
    }
  );
}

async function getChangePointForField({
  index,
  field,
  esClient,
  start,
  end,
  aggregationType,
}: {
  index: string;
  field: string;
  esClient: ElasticsearchClient;
  start: string;
  end: string;
  aggregationType: 'avg' | 'min' | 'max' | 'sum';
}) {
  return new Promise((resolve) => {
    esClient
      .search({
        index,
        aggregations: {
          over_time: {
            auto_date_histogram: {
              field: '@timestamp',
              buckets: 40,
            },
            aggs: {
              function_value: {
                [aggregationType]: {
                  field: `${field}`,
                },
              },
            },
          },
          change_point_request: {
            change_point: {
              buckets_path: 'over_time>function_value',
            },
          },
        },
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    from: start || 'now-24h',
                    to: end || 'now',
                  },
                },
              },
            ],
            must_not: [],
          },
        },
      })
      .then((searchResults) => {
        resolve({
          ...searchResults,
          fieldName: field,
        });
      });
  });
}

export type GetSLOChangePointArguments = FromSchema<typeof parameters>;

export interface GetSLOChangePointFunctionResponse {
  content: any;
  data: any;
}

// how to pass space id to assistant
// how to add labels to table
// how to add links to apps to your responses

// improving natural language model, having to provide more context

// how do I let the user know that their given field cannot be used for change point detection

// TODO: Fetch alerts for given SLOs

// Can determine lookback time based on alert window.

// link to change point detection docs

// omit the change point value, it's not relevant compared to the time

// What I've learned
// * Running change point detection from the alert start minus the long window can be misleading

// Issues
// Visualization sometimes does not match results
