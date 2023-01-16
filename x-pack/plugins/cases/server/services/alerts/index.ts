/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { isEmpty } from 'lodash';

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { STATUS_VALUES } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import type { MgetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { CaseStatuses } from '../../../common/api';
import { MAX_ALERTS_PER_CASE, MAX_CONCURRENT_SEARCHES } from '../../../common/constants';
import { createCaseError } from '../../common/error';
import type { AlertInfo } from '../../common/types';
import type { UpdateAlertCasesRequest, UpdateAlertStatusRequest } from '../../client/alerts/types';
import type { AggregationBuilder, AggregationResponse } from '../../client/metrics/types';

export class AlertService {
  constructor(
    private readonly scopedClusterClient: ElasticsearchClient,
    private readonly logger: Logger,
    private readonly alertsClient: PublicMethodsOf<AlertsClient>
  ) {}

  public async executeAggregations({
    aggregationBuilders,
    alerts,
  }: {
    aggregationBuilders: Array<AggregationBuilder<unknown>>;
    alerts: AlertIdIndex[];
  }): Promise<AggregationResponse> {
    try {
      const { ids, indices } = AlertService.getUniqueIdsIndices(alerts);

      const builtAggs = aggregationBuilders.reduce((acc, agg) => {
        return { ...acc, ...agg.build() };
      }, {});

      const res = await this.scopedClusterClient.search({
        index: indices,
        ignore_unavailable: true,
        query: { ids: { values: ids } },
        size: 0,
        aggregations: builtAggs,
      });

      return res.aggregations;
    } catch (error) {
      const aggregationNames = aggregationBuilders.map((agg) => agg.getName());

      throw createCaseError({
        message: `Failed to execute aggregations [${aggregationNames.join(',')}]: ${error}`,
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

  public async updateAlertsStatus(alerts: UpdateAlertStatusRequest[]) {
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
    alerts: UpdateAlertStatusRequest[]
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

  private translateStatus(alert: UpdateAlertStatusRequest): STATUS_VALUES {
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

  public async getAlerts(alertsInfo: AlertInfo[]): Promise<MgetResponse<Alert> | undefined> {
    try {
      const docs = alertsInfo
        .filter((alert) => !AlertService.isEmptyAlert(alert))
        .slice(0, MAX_ALERTS_PER_CASE)
        .map((alert) => ({ _id: alert.id, _index: alert.index }));

      if (docs.length <= 0) {
        return;
      }

      const results = await this.scopedClusterClient.mget<Alert>({ body: { docs } });

      return results;
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve alerts ids: ${JSON.stringify(alertsInfo)}: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  public async bulkUpdateCases({ alerts, caseIds }: UpdateAlertCasesRequest): Promise<void> {
    try {
      await this.alertsClient.bulkUpdateCases({
        alerts,
        caseIds,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to add case info to alerts for caseIds ${caseIds}: ${error}`,
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

export interface Alert {
  _id: string;
  _index: string;
  _source: Record<string, unknown>;
}

interface AlertIdIndex {
  id: string;
  index: string;
}
