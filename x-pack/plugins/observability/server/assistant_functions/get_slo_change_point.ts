/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TimeBuckets } from '@kbn/data-plugin/common';
import type { IUiSettingsClient } from '@kbn/core/server';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import { FromSchema } from 'json-schema-to-ts';
import { DataView, DataViewsService } from '@kbn/data-views-plugin/common';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { i18n } from '@kbn/i18n';
import datemath from '@kbn/datemath';
import { FunctionRegistrationParameters } from '.';
export interface SLOSourceItem {
  name: string;
  sourceIndex: string;
}

export interface ChangePointResponse {
  aggregations: { change_point_request: { bucket: { key: string }; type: string } };
  fieldName: string;
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
      description: 'Optional start of the time range, in Elasticsearch date math, like `now-24h`.',
    },
    end: {
      type: 'string',
      description: 'Optional end of the time range, in Elasticsearch date math, like `now`.',
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
  uiSettingsClient,
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
        uiSettingsClient,
        dataViewsClient,
        start,
        end,
        name,
        id,
        alertStart,
        longWindow,
        metricOperation
      );
      await sloChangePoint.setup();
      const dataView = sloChangePoint.dataView;
      const { start: absoluteStart, end: absoluteEnd } = sloChangePoint.absoluteStartTime;

      const esClient = (await resources.context.core).elasticsearch.client.asCurrentUser;

      const metricFields = dataView?.fields
        .getByType('number')
        .filter((f) => f.aggregatable === true)
        .map((f) => f.name);

      const results = await Promise.all(
        (metricFields || []).map((fieldName) =>
          getChangePointForField({
            index: sloChangePoint.sourceIndex!,
            field: fieldName,
            esClient,
            start: absoluteStart,
            end: absoluteEnd,
            aggregationType: metricOperation,
            interval: sloChangePoint.bucketInterval?.expression!,
          })
        )
      );

      const changes = results.map((result) => ({
        changedAtApproximateTime: moment(result.aggregations?.change_point_request?.bucket?.key)
          .tz(sloChangePoint.timezone!)
          .format(sloChangePoint.dateFormat),
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
  public dateFormat?: string;
  public timeBuckets?: TimeBuckets;
  public timezone?: string;
  public dataView?: DataView;
  public slo?: SLOWithSummaryResponse;

  constructor(
    private sloClient: FunctionRegistrationParameters['sloClient'],
    private uiSettingsClient: IUiSettingsClient,
    private dataViewsClient: DataViewsService,
    private start?: string,
    private end?: string,
    private name?: string,
    private id?: string,
    private alertStart?: string,
    private longWindow?: string,
    private metricOperation? = 'avg'
  ) {}

  public async setup() {
    this.dateFormat = await this.uiSettingsClient.get('dateFormat');
    this.timeBuckets = new TimeBuckets({
      'histogram:maxBars': await this.uiSettingsClient.get('histogram:maxBars'),
      'histogram:barTarget': await this.uiSettingsClient.get('histogram:barTarget'),
      dateFormat: this.dateFormat,
      'dateFormat:scaled': await this.uiSettingsClient.get('dateFormat:scaled'),
    });
    this.slo = await this.getSLO();
    const sourceIndex = this.slo?.indicator.params.index;
    const dataViewId = (await this.dataViewsClient.getIdsWithTitle()).find((view) => {
      return view.title === sourceIndex;
    })?.id;
    if (dataViewId) {
      this.dataView = await this.dataViewsClient.get(dataViewId);
    } else {
      this.dataView = await this.dataViewsClient.create({
        title: sourceIndex,
      });
    }

    const tz = await this.uiSettingsClient.get('dateFormat:tz');
    this.timezone = tz === 'Browser' ? 'UTC' : tz;

    this.setTimeBounds();
  }

  public async getSLO() {
    const kqlQueries = [];
    if (!this.id && !this.name) {
      throw new Error('Please provide one of the following: SLO name or SLO ID');
    }
    if (this.id) {
      kqlQueries.push(`slo.id: "${this.id}"`);
    }
    if (this.name) {
      kqlQueries.push(`slo.name: "${this.name}*"`);
    }
    const params = {
      kqlQuery: kqlQueries.join(' AND '),
      page: '1',
      perPage: '1',
    };

    const findResponse = await this.sloClient.find.execute(params);
    return findResponse.results[0];
  }

  public get absoluteStartTime() {
    const end = this.end
      ? datemath.parse(this.end)?.toISOString()
      : datemath.parse('now')?.toISOString();
    let start;
    if (this.start) {
      start = datemath.parse(this.start!)?.toISOString();
    } else if (this.alertWindowStart) {
      start = this.alertWindowStart;
    } else {
      start = datemath.parse('now-24h')?.toISOString();
    }
    return {
      start,
      end,
    };
  }

  public get alertWindowStart() {
    if (this.alertStart && this.longWindow) {
      return datemath
        .parse(`now-${this.longWindow}`, { forceNow: new Date(this.alertStart) })
        ?.toISOString();
    }
    return null;
  }

  public get sourceIndex() {
    return this.slo?.indicator.params.index;
  }

  public get timebound() {
    this.checkTimeBuckets();
    return this.timeBuckets?.getTimeBound();
  }

  public setTimeBounds() {
    this.checkTimeBuckets();
    this.timeBuckets?.setBounds({
      min: moment(this.absoluteStartTime.start),
      max: moment(this.absoluteStartTime.end),
    });
    this.timeBuckets?.setInterval('auto');
  }

  public get bucketInterval() {
    this.checkTimeBuckets();
    return this.timeBuckets?.getInterval();
  }

  private checkTimeBuckets() {
    if (!this.timeBuckets) {
      throw new Error(
        'Timebuckets not registered. Please call the setup function before continuing'
      );
    }
  }
}

async function getChangePointForField({
  index,
  field,
  esClient,
  start,
  end,
  aggregationType = 'avg',
  interval,
}: {
  index: string;
  field: string;
  esClient: ElasticsearchClient;
  start?: string;
  end?: string;
  aggregationType?: string;
  interval: string;
}): Promise<ChangePointResponse> {
  return new Promise<ChangePointResponse>((resolve) => {
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
        } as unknown as ChangePointResponse);
      });
  });
}

export type GetSLOChangePointArguments = FromSchema<typeof parameters>;

export interface GetSLOChangePointFunctionResponse {
  content: any;
  data: any;
}

