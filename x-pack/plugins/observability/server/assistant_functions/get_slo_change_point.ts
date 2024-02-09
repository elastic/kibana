/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TimeBuckets } from '@kbn/data-plugin/common';
import moment from 'moment';
import { FromSchema } from 'json-schema-to-ts';
import { DataView } from '@kbn/data-views-plugin/common';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { i18n } from '@kbn/i18n';
import datemath from '@kbn/datemath';
import { FunctionRegistrationParameters } from '.';
export interface SLOSourceItem {
  name: string;
  sourceIndex: string;
}

const parameters = {
  type: 'object',
  additionalProperties: true,
  properties: {
    'slo.name': {
      type: 'string',
      description: 'Optional filter the slos by name',
    },
    'slo.id': {
      type: 'string',
      description: 'Optional filter the slos by id',
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
        'slo.id': id,
        longWindow,
        start,
        end,
        'kibana.alert.start': alertStart,
        metricOperation = 'avg',
      } = args;
      const sloChangePoint = new SLOChangePoint(
        sloClient,
        name,
        id,
        start,
        end,
        alertStart,
        longWindow,
        metricOperation
      );
      const slo = await sloChangePoint.getSLO();
      const { start: absoluteStart, end: absoluteEnd } = sloChangePoint.getAbsoluteStartTime();

      const esClient = (await resources.context.core).elasticsearch.client.asCurrentUser;

      const sourceIndex = slo.indicator.params.index;
      let dataView: DataView;

      const dataViewId = (await dataViewsClient.getIdsWithTitle()).find((view) => {
        return view.title === sourceIndex;
      })?.id;
      if (dataViewId) {
        dataView = await dataViewsClient.get(dataViewId);
      } else {
        dataView = await dataViewsClient.create({
          title: sourceIndex,
        });
      }

      const metricFields = dataView.fields
        .getByType('number')
        .filter((f) => f.aggregatable === true)
        .map((f) => f.name);

      const results = await Promise.all(
        metricFields.map((fieldName) =>
          getChangePointForField({
            index: sourceIndex,
            field: fieldName,
            esClient,
            start: absoluteStart,
            end: absoluteEnd,
            aggregationType: metricOperation,
            interval: sloChangePoint.getBucketInterval().expression,
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
          observedPeriodStart: start || sloChangePoint.alertWindowStart || 'now-24h',
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

export class SLOChangePoint {
  private timeBuckets = new TimeBuckets({
    'histogram:maxBars': 1000,
    'histogram:barTarget': 50,
    dateFormat: 'YYYY-MM-DD',
    'dateFormat:scaled': [
      ['', 'HH:mm:ss.SSS'],
      ['PT1S', 'HH:mm:ss'],
      ['PT1M', 'HH:mm'],
      ['PT1H', 'YYYY-MM-DD HH:mm'],
      ['P1DT', 'YYYY-MM-DD'],
      ['P1YT', 'YYYY'],
    ],
  });

  constructor(
    private sloClient: FunctionRegistrationParameters['sloClient'],
    private name: string,
    private id: string | undefined,
    private start: string,
    private end: string,
    private alertStart: string,
    private longWindow: string,
    private metricOperation = 'avg'
  ) {
    this.setTimeBounds();
  }

  public async getSLO() {
    const params = {
      kqlQuery: `slo.name: "${this.name}*"`,
      page: '1',
      perPage: '1',
    };
    if (this.id) {
      params.kqlQuery += ` AND slo.id: "${this.id}"`;
    }
    const findResponse = await this.sloClient.find.execute(params);
    return findResponse.results[0];
  }

  public get alertWindowStart() {
    if (this.alertStart && this.longWindow) {
      return datemath
        .parse(`now-${this.longWindow}`, { forceNow: new Date(this.alertStart) })
        ?.valueOf();
    }
    return null;
  }

  public getAbsoluteStartTime() {
    const end = this.end ? datemath.parse(this.end).valueOf() : datemath.parse('now').valueOf();
    let start;
    if (this.start) {
      start = datemath.parse(this.start).valueOf();
    } else if (this.alertWindowStart) {
      start = datemath.parse(this.alertWindowStart).valueOf();
    } else {
      start = datemath.parse('now-24h').valueOf();
    }
    return {
      start,
      end,
    };
  }

  public getTimeBound() {
    timeBuckets.getTimeBound();
  }

  public setTimeBounds() {
    const absoluteStartTime = this.getAbsoluteStartTime();
    this.timeBuckets.setBounds({
      min: moment(absoluteStartTime.start),
      max: moment(absoluteStartTime.end),
    });
    this.timeBuckets.setInterval('auto');
  }

  public getBucketInterval() {
    return this.timeBuckets.getInterval();
  }
}

async function getChangePointForField({
  index,
  field,
  esClient,
  start,
  end,
  aggregationType,
  interval,
}: {
  index: string;
  field: string;
  esClient: ElasticsearchClient;
  start: string;
  end: string;
  aggregationType: 'avg' | 'min' | 'max' | 'sum';
  interval: string;
}) {
  return new Promise((resolve) => {
    esClient
      .search({
        index,
        aggregations: {
          over_time: {
            date_histogram: {
              field: '@timestamp', // adjust to make time field dyanamic based on the data view
              fixed_interval: interval,
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
