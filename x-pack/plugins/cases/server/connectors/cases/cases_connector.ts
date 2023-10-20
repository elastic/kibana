/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stringify from 'json-stable-stringify';
import type { ServiceParams } from '@kbn/actions-plugin/server';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import { pick } from 'lodash';
import { CASES_CONNECTOR_SUB_ACTION } from './constants';
import type {
  BulkCreateOracleRecordRequest,
  CasesConnectorConfig,
  CasesConnectorRunParams,
  CasesConnectorSecrets,
  OracleRecord,
  OracleRecordCreateRequest,
} from './types';
import { CasesConnectorRunParamsSchema } from './schema';
import { CasesOracleService } from './cases_oracle_service';
import { partitionRecords } from './utils';

interface GroupedAlerts {
  alerts: CasesConnectorRunParams['alerts'];
  grouping: Record<string, unknown>;
}

type GroupedAlertsWithOracleKey = GroupedAlerts & { oracleKey: string };

export class CasesConnector extends SubActionConnector<
  CasesConnectorConfig,
  CasesConnectorSecrets
> {
  private readonly casesOracleService;

  constructor(params: ServiceParams<CasesConnectorConfig, CasesConnectorSecrets>) {
    super(params);
    this.casesOracleService = new CasesOracleService({
      log: this.logger,
      /**
       * TODO: Think about permissions etc.
       * Should we use our own savedObjectsClient as we do
       * in the cases client? Should we so the createInternalRepository?
       */
      unsecuredSavedObjectsClient: this.savedObjectsClient,
    });
    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: CASES_CONNECTOR_SUB_ACTION.RUN,
      method: 'run',
      schema: CasesConnectorRunParamsSchema,
    });
  }

  /**
   * Method is not needed for the Case Connector.
   * The function throws an error as a reminder to
   * implement it if we need it in the future.
   */
  protected getResponseErrorMessage(): string {
    throw new Error('Method not implemented.');
  }

  private groupAlerts({
    alerts,
    groupingBy,
  }: Pick<CasesConnectorRunParams, 'alerts' | 'groupingBy'>): GroupedAlerts[] {
    const uniqueGroupingByFields = Array.from(new Set<string>(groupingBy));
    const groupingMap = new Map<string, GroupedAlerts>();

    const filteredAlerts = alerts.filter((alert) =>
      uniqueGroupingByFields.every((groupingByField) => Object.hasOwn(alert, groupingByField))
    );

    for (const alert of filteredAlerts) {
      const alertWithOnlyTheGroupingFields = pick(alert, uniqueGroupingByFields);
      const groupingKey = stringify(alertWithOnlyTheGroupingFields);

      if (groupingMap.has(groupingKey)) {
        groupingMap.get(groupingKey)?.alerts.push(alert);
      } else {
        groupingMap.set(groupingKey, { alerts: [alert], grouping: alertWithOnlyTheGroupingFields });
      }
    }

    return Array.from(groupingMap.values());
  }

  private generateOracleKeys(
    params: CasesConnectorRunParams,
    groupedAlerts: GroupedAlerts[]
  ): GroupedAlertsWithOracleKey[] {
    const { rule, owner } = params;
    /**
     * TODO: Take spaceId from the actions framework
     */
    const spaceId = 'default';

    const oracleMap = new Map<string, GroupedAlertsWithOracleKey>();

    for (const { grouping, alerts } of groupedAlerts) {
      const oracleKey = this.casesOracleService.getRecordId({
        ruleId: rule.id,
        grouping,
        owner,
        spaceId,
      });

      oracleMap.set(oracleKey, { oracleKey, grouping, alerts });
    }

    return Array.from(oracleMap.values());
  }

  private async bulkGetOrCreateOracleRecords(
    groupedAlertsWithOracleKey: GroupedAlertsWithOracleKey[]
  ): Promise<OracleRecord[]> {
    const bulkCreateReq: BulkCreateOracleRecordRequest = [];

    const ids = groupedAlertsWithOracleKey.map(({ oracleKey }) => oracleKey);

    const bulkGetRes = await this.casesOracleService.bulkGetRecords(ids);
    const [bulkGetValidRecords, bulkGetRecordsErrors] = partitionRecords(bulkGetRes);

    if (bulkGetRecordsErrors.length === 0) {
      return bulkGetValidRecords;
    }

    const recordsMap = new Map<string, OracleRecordCreateRequest>(
      groupedAlertsWithOracleKey.map(({ oracleKey, grouping }) => [
        oracleKey,
        // TODO: Add the rule info
        { cases: [], rules: [], grouping },
      ])
    );

    for (const error of bulkGetRecordsErrors) {
      if (error.id && recordsMap.has(error.id)) {
        bulkCreateReq.push({
          recordId: error.id,
          payload: recordsMap.get(error.id) ?? { cases: [], rules: [], grouping: {} },
        });
      }
    }

    /**
     * TODO: Create records with only 404 errors
     * All others should throw an error and retry again
     */
    const bulkCreateRes = await this.casesOracleService.bulkCreateRecord(bulkCreateReq);

    /**
     * TODO: Retry on errors
     */
    const [bulkCreateValidRecords, _] = partitionRecords(bulkCreateRes);

    return [...bulkGetValidRecords, ...bulkCreateValidRecords];
  }

  public async run(params: CasesConnectorRunParams) {
    const { alerts, groupingBy } = params;

    /**
     * TODO: Handle when grouping is not defined
     * One case should be created per rule
     */
    const groupedAlerts = this.groupAlerts({ alerts, groupingBy });
    const groupedAlertsWithOracleKey = this.generateOracleKeys(params, groupedAlerts);
    console.log(
      '🚀 ~ file: cases_connector.ts:175 ~ run ~ groupedAlertsWithOracleKey:',
      groupedAlertsWithOracleKey
    );
    /**
     * Add circuit breakers to the number of oracles they can be created or retrieved
     */
    const oracleRecords = this.bulkGetOrCreateOracleRecords(groupedAlertsWithOracleKey);
  }
}
