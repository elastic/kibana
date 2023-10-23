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
import type { KibanaRequest } from '@kbn/core-http-server';
import { CoreKibanaRequest } from '@kbn/core/server';
import pMap from 'p-map';
import type { Case } from '../../../common';
import { AttachmentType } from '../../../common';
import { CASES_CONNECTOR_SUB_ACTION, MAX_CONCURRENT_REQUEST_ATTACH_ALERTS } from './constants';
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
import { CasesService } from './cases_service';
import type { CasesClient } from '../../client';
import type { BulkCreateArgs as BulkCreateAlertsReq } from '../../client/attachments/types';

interface CasesConnectorParams {
  connectorParams: ServiceParams<CasesConnectorConfig, CasesConnectorSecrets>;
  casesParams: { getCasesClient: (request: KibanaRequest) => Promise<CasesClient> };
}

interface GroupedAlerts {
  alerts: CasesConnectorRunParams['alerts'];
  grouping: Record<string, unknown>;
}

type GroupedAlertsWithOracleKey = GroupedAlerts & { oracleKey: string };
type GroupedAlertsWithCaseId = GroupedAlertsWithOracleKey & { caseId: string };
type GroupedAlertsWithCases = GroupedAlertsWithCaseId & { theCase: Case };

export class CasesConnector extends SubActionConnector<
  CasesConnectorConfig,
  CasesConnectorSecrets
> {
  private readonly casesOracleService: CasesOracleService;
  private readonly casesService: CasesService;
  private readonly kibanaRequest: KibanaRequest;
  private readonly casesParams: CasesConnectorParams['casesParams'];

  constructor({ connectorParams, casesParams }: CasesConnectorParams) {
    super(connectorParams);

    this.casesOracleService = new CasesOracleService({
      log: this.logger,
      /**
       * TODO: Think about permissions etc.
       * Should we use our own savedObjectsClient as we do
       * in the cases client? Should we so the createInternalRepository?
       */
      unsecuredSavedObjectsClient: this.savedObjectsClient,
    });

    this.casesService = new CasesService();

    /**
     * TODO: Get request from the actions framework.
     * Should be set in the SubActionConnector's constructor
     */
    this.kibanaRequest = CoreKibanaRequest.from({ path: '/', headers: {} });

    this.casesParams = casesParams;

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

  public async run(params: CasesConnectorRunParams) {
    const { alerts, groupingBy } = params;
    const casesClient = await this.casesParams.getCasesClient(this.kibanaRequest);

    /**
     * TODO: Handle when grouping is not defined
     * One case should be created per rule
     */
    const groupedAlerts = this.groupAlerts({ alerts, groupingBy });
    const groupedAlertsWithOracleKey = this.generateOracleKeys(params, groupedAlerts);

    /**
     * Add circuit breakers to the number of oracles they can be created or retrieved
     */
    const oracleRecords = await this.bulkGetOrCreateOracleRecords(
      Array.from(groupedAlertsWithOracleKey.values())
    );

    const groupedAlertsWithCaseId = this.generateCaseIds(
      params,
      groupedAlertsWithOracleKey,
      oracleRecords
    );

    const groupedAlertsWithCases = await this.bulkGetOrCreateCases(
      casesClient,
      groupedAlertsWithCaseId
    );

    await this.attachAlertsToCases(casesClient, groupedAlertsWithCases, params);
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
  ): Map<string, GroupedAlertsWithOracleKey> {
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

    return oracleMap;
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

  private generateCaseIds(
    params: CasesConnectorRunParams,
    groupedAlertsWithOracleKey: Map<string, GroupedAlertsWithOracleKey>,
    oracleRecords: OracleRecord[]
  ): Map<string, GroupedAlertsWithCaseId> {
    const { rule, owner } = params;

    /**
     * TODO: Take spaceId from the actions framework
     */
    const spaceId = 'default';

    const casesMap = new Map<string, GroupedAlertsWithCaseId>();

    for (const oracleRecord of oracleRecords) {
      const { alerts, grouping } = groupedAlertsWithOracleKey.get(oracleRecord.id) ?? {
        alerts: [],
        grouping: {},
      };

      const caseId = this.casesService.getCaseId({
        ruleId: rule.id,
        grouping,
        owner,
        spaceId,
        counter: oracleRecord.counter,
      });

      casesMap.set(caseId, { caseId, alerts, grouping, oracleKey: oracleRecord.id });
    }

    return casesMap;
  }

  private async bulkGetOrCreateCases(
    casesClient: CasesClient,
    groupedAlertsWithCaseId: Map<string, GroupedAlertsWithCaseId>
  ): Promise<Map<string, GroupedAlertsWithCases>> {
    const casesMap = new Map<string, GroupedAlertsWithCases>();

    const ids = Array.from(groupedAlertsWithCaseId.values()).map(({ caseId }) => caseId);
    const { cases, errors } = await casesClient.cases.bulkGet({ ids });

    for (const theCase of cases) {
      if (groupedAlertsWithCaseId.has(theCase.id)) {
        const data = groupedAlertsWithCaseId.get(theCase.id) as GroupedAlertsWithCaseId;
        casesMap.set(theCase.id, { ...data, theCase });
      }
    }

    if (errors.length === 0) {
      return casesMap;
    }

    /**
     * TODO: Bulk create cases that do not exist (404)
     */
    return casesMap;
  }

  private async attachAlertsToCases(
    casesClient: CasesClient,
    groupedAlertsWithCases: Map<string, GroupedAlertsWithCases>,
    params: CasesConnectorRunParams
  ): Promise<void> {
    const { rule } = params;

    const bulkCreateAlertsRequest: BulkCreateAlertsReq[] = Array.from(
      groupedAlertsWithCases.values()
    ).map(({ theCase, alerts }) => ({
      caseId: theCase.id,
      /**
       * TODO: Verify _id, _index
       */
      attachments: alerts.map((alert) => ({
        type: AttachmentType.alert,
        alertId: alert._id,
        index: alert._index,
        rule: { id: rule.id, name: rule.name },
        owner: theCase.owner,
      })),
    }));

    await pMap(
      bulkCreateAlertsRequest,
      (req: BulkCreateAlertsReq) => casesClient.attachments.bulkCreate(req),
      {
        concurrency: MAX_CONCURRENT_REQUEST_ATTACH_ALERTS,
      }
    );
  }
}
