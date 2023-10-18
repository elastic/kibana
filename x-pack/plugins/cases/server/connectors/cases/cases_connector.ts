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
import type { CasesConnectorConfig, CasesConnectorRunParams, CasesConnectorSecrets } from './types';
import { CasesConnectorRunParamsSchema } from './schema';
import { CasesOracleService } from './cases_oracle_service';

interface GroupingMapValue {
  alerts: CasesConnectorRunParams['alerts'];
  grouping: Record<string, unknown>;
}

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
  }: Pick<CasesConnectorRunParams, 'alerts' | 'groupingBy'>): Map<string, GroupingMapValue> {
    const uniqueGroupingByFields = Array.from(new Set<string>(groupingBy));
    const groupingMap = new Map<string, GroupingMapValue>();

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

    return groupingMap;
  }

  private generateOracleKeys(
    params: CasesConnectorRunParams,
    groupingMap: Map<string, GroupingMapValue>
  ): Map<string, GroupingMapValue> {
    const { rule, owner } = params;
    /**
     * TODO: Take spaceId from the actions framework
     */
    const spaceId = 'default';

    const oracleMap = new Map<string, GroupingMapValue>();

    for (const { grouping, alerts } of groupingMap.values()) {
      const oracleKey = this.casesOracleService.getRecordId({
        ruleId: rule.id,
        grouping,
        owner,
        spaceId,
      });

      oracleMap.set(oracleKey, { grouping, alerts });
    }

    return oracleMap;
  }

  private getOracleRecord(groupingMap: Map<string, GroupingMapValue>): Promise<OracleRecord> {}

  public async run(params: CasesConnectorRunParams) {
    const { alerts, groupingBy } = params;
    const groupingMap = this.groupAlerts({ alerts, groupingBy });
    const oracleMap = this.generateOracleKeys(params, groupingMap);

    const oracleKeys = oracleMap.keys();

    // const oracleBulkGetRes = this.casesOracleService.bulkGetRecords(Array.from(oracleKeys));
  }
}
