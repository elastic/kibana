/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { isEmpty, get } from 'lodash';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient, Logger } from 'kibana/server';
import { CaseStatuses } from '../../../common/api';
import { MAX_ALERTS_PER_SUB_CASE, MAX_CONCURRENT_SEARCHES } from '../../../common/constants';
import { createCaseError } from '../../common/error';
import { AlertInfo } from '../../common/types';
import { UpdateAlertRequest } from '../../client/alerts/types';
import {
  ALERT_WORKFLOW_STATUS,
  STATUS_VALUES,
} from '../../../../rule_registry/common/technical_rule_data_field_names';
import {
  AggregationFields,
  FrequencyResult,
  HostAggregate,
  UniqueCountResult,
  UserAggregate,
} from './types';

export class AlertService {
  constructor(
    private readonly scopedClusterClient: ElasticsearchClient,
    private readonly logger: Logger
  ) {}

  public async countUniqueValuesForFields({
    fields,
    alerts,
  }: {
    fields: AggregationFields[];
    alerts: AlertIdIndex[];
  }): Promise<UniqueCountResult> {
    try {
      const { ids, indices } = AlertService.getUniqueIdsIndices(alerts);

      const res = await this.scopedClusterClient.search({
        index: indices,
        query: { ids: { values: ids } },
        size: 0,
        aggregations: AlertService.buildTotalUniqueAggregations(fields),
      });

      const aggs = res.body.aggregations as UniqueFieldAggregate;

      return {
        totalHosts: aggs.hosts?.value,
        totalUsers: aggs.users?.value,
      };
    } catch (error) {
      throw createCaseError({
        message: `Failed to count totals for fields: ${JSON.stringify(fields)}: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  private static buildTotalUniqueAggregations(fields: AggregationFields[]) {
    return fields.reduce<Record<string, estypes.AggregationsAggregationContainer>>((acc, field) => {
      switch (field) {
        case AggregationFields.Hosts:
          return {
            ...acc,
            hosts: {
              cardinality: {
                field: 'host.id',
              },
            },
          };
        case AggregationFields.Users:
          return {
            ...acc,
            users: {
              cardinality: {
                field: 'user.name',
              },
            },
          };
        default:
          return acc;
      }
    }, {});
  }

  public async getMostFrequentValuesForFields({
    fields,
    alerts,
    size = 10,
  }: {
    fields: AggregationFields[];
    alerts: Array<{ id: string; index: string }>;
    size?: number;
  }): Promise<FrequencyResult> {
    try {
      const { ids, indices } = AlertService.getUniqueIdsIndices(alerts);

      const res = await this.scopedClusterClient.search({
        index: indices,
        query: { ids: { values: ids } },
        aggregations: AlertService.buildFieldAggregations(fields, size),
        size: 0,
      });

      const aggs = res.body.aggregations as FieldAggregate;

      return {
        hosts: AlertService.getMostFrequentHosts(aggs),
        users: AlertService.getMostFrequentUsers(aggs),
      };
    } catch (error) {
      throw createCaseError({
        message: `Failed to aggregate fields: ${JSON.stringify(fields)}: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  private static getUniqueIdsIndices(alerts: AlertIdIndex[]): { ids: string[]; indices: string[] } {
    const { ids, indices } = alerts.reduce(
      (acc, alert) => {
        acc.ids.add(alert.id);
        acc.indices.add(alert.index);
        return acc;
      },
      { ids: new Set<string>(), indices: new Set<string>() }
    );

    return {
      ids: Array.from(ids),
      indices: Array.from(indices),
    };
  }

  private static buildFieldAggregations(fields: AggregationFields[], size: number) {
    const topHits: estypes.AggregationsAggregationContainer = {
      aggs: {
        top_fields: {
          top_hits: {
            docvalue_fields: ['host.name'],
            sort: [
              {
                '@timestamp': {
                  order: 'desc',
                },
              },
            ],
            size: 1,
          },
        },
      },
    };

    return fields.reduce<Record<string, estypes.AggregationsAggregationContainer>>((acc, field) => {
      switch (field) {
        case AggregationFields.Hosts:
          return {
            ...acc,
            hosts: {
              terms: {
                field: 'host.id',
                size,
              },
              ...topHits,
            },
          };
        case AggregationFields.Users:
          return {
            ...acc,
            users: {
              terms: {
                field: 'user.name',
                size,
              },
            },
          };
        default:
          return acc;
      }
    }, {});
  }

  private static getMostFrequentHosts(aggs: FieldAggregate): HostAggregate[] | undefined {
    const getName = (bucket: FieldAggregateBucket) => {
      const unsafeHostName = get(bucket.top_fields.hits.hits[0].fields, 'host.name');

      if (Array.isArray(unsafeHostName) && unsafeHostName.length > 0) {
        return unsafeHostName[0];
      }
      return unsafeHostName;
    };

    return aggs.hosts?.buckets.map((bucket) => {
      return {
        name: getName(bucket),
        id: bucket.key,
        count: bucket.doc_count,
      };
    });
  }

  private static getMostFrequentUsers(aggs: FieldAggregate): UserAggregate[] | undefined {
    return aggs.users?.buckets.map((bucket) => ({ name: bucket.key, count: bucket.doc_count }));
  }

  public async updateAlertsStatus(alerts: UpdateAlertRequest[]) {
    try {
      const bucketedAlerts = this.bucketAlertsByIndexAndStatus(alerts);
      const indexBuckets = Array.from(bucketedAlerts.entries());

      await pMap(
        indexBuckets,
        async (indexBucket: [string, Map<STATUS_VALUES, TranslatedUpdateAlertRequest[]>]) =>
          this.updateByQuery(indexBucket),
        { concurrency: MAX_CONCURRENT_SEARCHES }
      );
    } catch (error) {
      throw createCaseError({
        message: `Failed to update alert status ids: ${JSON.stringify(alerts)}: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  private bucketAlertsByIndexAndStatus(
    alerts: UpdateAlertRequest[]
  ): Map<string, Map<STATUS_VALUES, TranslatedUpdateAlertRequest[]>> {
    return alerts.reduce<Map<string, Map<STATUS_VALUES, TranslatedUpdateAlertRequest[]>>>(
      (acc, alert) => {
        // skip any alerts that are empty
        if (AlertService.isEmptyAlert(alert)) {
          return acc;
        }

        const translatedAlert = { ...alert, status: this.translateStatus(alert) };
        const statusToAlertId = acc.get(translatedAlert.index);

        // if we haven't seen the index before
        if (!statusToAlertId) {
          // add a new index in the parent map, with an entry for the status the alert set to pointing
          // to an initial array of only the current alert
          acc.set(translatedAlert.index, createStatusToAlertMap(translatedAlert));
        } else {
          // We had the index in the map so check to see if we have a bucket for the
          // status, if not add a new status entry with the alert, if so update the status entry
          // with the alert
          updateIndexEntryWithStatus(statusToAlertId, translatedAlert);
        }

        return acc;
      },
      new Map()
    );
  }

  private static isEmptyAlert(alert: AlertInfo): boolean {
    return isEmpty(alert.id) || isEmpty(alert.index);
  }

  private translateStatus(alert: UpdateAlertRequest): STATUS_VALUES {
    const translatedStatuses: Record<string, STATUS_VALUES> = {
      [CaseStatuses.open]: 'open',
      [CaseStatuses['in-progress']]: 'acknowledged',
      [CaseStatuses.closed]: 'closed',
    };

    const translatedStatus = translatedStatuses[alert.status];
    if (!translatedStatus) {
      this.logger.error(
        `Unable to translate case status ${alert.status} during alert update: ${JSON.stringify(
          alert
        )}`
      );
    }
    return translatedStatus ?? 'open';
  }

  private async updateByQuery([index, statusToAlertMap]: [
    string,
    Map<STATUS_VALUES, TranslatedUpdateAlertRequest[]>
  ]) {
    const statusBuckets = Array.from(statusToAlertMap);
    return Promise.all(
      // this will create three update by query calls one for each of the three statuses
      statusBuckets.map(([status, translatedAlerts]) =>
        this.scopedClusterClient.updateByQuery({
          index,
          conflicts: 'abort',
          body: {
            script: {
              source: `if (ctx._source['${ALERT_WORKFLOW_STATUS}'] != null) {
                ctx._source['${ALERT_WORKFLOW_STATUS}'] = '${status}'
              }
              if (ctx._source.signal != null && ctx._source.signal.status != null) {
                ctx._source.signal.status = '${status}'
              }`,
              lang: 'painless',
            },
            // the query here will contain all the ids that have the same status for the same index
            // being updated
            query: { ids: { values: translatedAlerts.map(({ id }) => id) } },
          },
          ignore_unavailable: true,
        })
      )
    );
  }

  public async getAlerts(alertsInfo: AlertInfo[]): Promise<AlertsResponse | undefined> {
    try {
      const docs = alertsInfo
        .filter((alert) => !AlertService.isEmptyAlert(alert))
        .slice(0, MAX_ALERTS_PER_SUB_CASE)
        .map((alert) => ({ _id: alert.id, _index: alert.index }));

      if (docs.length <= 0) {
        return;
      }

      const results = await this.scopedClusterClient.mget<Alert>({ body: { docs } });

      // @ts-expect-error @elastic/elasticsearch _source is optional
      return results.body;
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve alerts ids: ${JSON.stringify(alertsInfo)}: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }
}

interface TranslatedUpdateAlertRequest {
  id: string;
  index: string;
  status: STATUS_VALUES;
}

function createStatusToAlertMap(
  alert: TranslatedUpdateAlertRequest
): Map<STATUS_VALUES, TranslatedUpdateAlertRequest[]> {
  return new Map<STATUS_VALUES, TranslatedUpdateAlertRequest[]>([[alert.status, [alert]]]);
}

function updateIndexEntryWithStatus(
  statusToAlerts: Map<STATUS_VALUES, TranslatedUpdateAlertRequest[]>,
  alert: TranslatedUpdateAlertRequest
) {
  const statusBucket = statusToAlerts.get(alert.status);

  if (!statusBucket) {
    statusToAlerts.set(alert.status, [alert]);
  } else {
    statusBucket.push(alert);
  }
}

interface FieldAggregateBucket {
  key: string;
  doc_count: number;
  top_fields: estypes.AggregationsTopHitsAggregate;
}

interface FieldAggregate {
  hosts?: {
    buckets: FieldAggregateBucket[];
  };
  users?: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

interface UniqueFieldAggregate {
  hosts?: {
    value: number;
  };
  users?: {
    value: number;
  };
}

interface Alert {
  _id: string;
  _index: string;
  _source: Record<string, unknown>;
}

interface AlertsResponse {
  docs: Alert[];
}

interface AlertIdIndex {
  id: string;
  index: string;
}
