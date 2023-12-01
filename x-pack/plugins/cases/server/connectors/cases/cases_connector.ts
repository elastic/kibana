/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stringify from 'json-stable-stringify';
import pMap from 'p-map';
import type { ServiceParams } from '@kbn/actions-plugin/server';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import { partition, pick } from 'lodash';
import type { KibanaRequest } from '@kbn/core-http-server';
import { CoreKibanaRequest } from '@kbn/core/server';
import dateMath from '@kbn/datemath';
import { CaseStatuses } from '@kbn/cases-components';
import type { BulkCreateCasesRequest } from '../../../common/types/api';
import type { Case, Cases } from '../../../common';
import { ConnectorTypes, AttachmentType } from '../../../common';
import { CASES_CONNECTOR_SUB_ACTION, MAX_CONCURRENT_ES_REQUEST } from './constants';
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
import { partitionRecordsByError } from './utils';
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

    const groupedAlerts = this.groupAlerts({ alerts, groupingBy });
    const groupedAlertsWithOracleKey = this.generateOracleKeys(params, groupedAlerts);

    /**
     * Add circuit breakers to the number of oracles they can be created or retrieved
     */
    const oracleRecords = await this.upsertOracleRecords(
      params,
      Array.from(groupedAlertsWithOracleKey.values())
    );

    const groupedAlertsWithCaseId = this.generateCaseIds(
      params,
      groupedAlertsWithOracleKey,
      oracleRecords
    );

    const groupedAlertsWithCases = await this.upsertCases(
      params,
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

    /**
     * We are interested in alerts that have a value for any
     * of the groupingBy fields defined by the users. All other
     * alerts will not be attached to any case.
     */
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

  private async upsertOracleRecords(
    params: CasesConnectorRunParams,
    groupedAlertsWithOracleKey: GroupedAlertsWithOracleKey[]
  ): Promise<OracleRecord[]> {
    const { timeWindow } = params;
    const bulkCreateReq: BulkCreateOracleRecordRequest = [];

    const ids = groupedAlertsWithOracleKey.map(({ oracleKey }) => oracleKey);

    const bulkGetRes = await this.casesOracleService.bulkGetRecords(ids);
    const [bulkGetValidRecords, bulkGetRecordsErrors] = partitionRecordsByError(bulkGetRes);

    const [recordsToIncreaseCounter, recordsWithoutIncreasedCounter] = partition(
      bulkGetValidRecords,
      (req) => this.isTimeWindowPassed(timeWindow, req.updatedAt ?? req.createdAt)
    );

    if (bulkGetRecordsErrors.length === 0 && recordsToIncreaseCounter.length === 0) {
      return bulkGetValidRecords;
    }

    const recordsMap = new Map<string, OracleRecordCreateRequest>(
      groupedAlertsWithOracleKey.map(({ oracleKey, grouping }) => [
        oracleKey,
        // TODO: Add the rule info
        { cases: [], rules: [], grouping },
      ])
    );

    /**
     * TODO: Throw/retry for other errors
     */
    const nonFoundErrors = bulkGetRecordsErrors.filter((error) => error.statusCode === 404);

    for (const error of nonFoundErrors) {
      if (error.id && recordsMap.has(error.id)) {
        bulkCreateReq.push({
          recordId: error.id,
          payload: recordsMap.get(error.id) ?? { cases: [], rules: [], grouping: {} },
        });
      }
    }

    const bulkUpdateReq = recordsToIncreaseCounter.map((record) => ({
      recordId: record.id,
      version: record.version,
      /**
       * TODO: Add new cases or any other related info
       */
      payload: { counter: record.counter + 1 },
    }));

    const bulkCreateRes = await this.casesOracleService.bulkCreateRecord(bulkCreateReq);
    const bulkUpdateRes = await this.casesOracleService.bulkUpdateRecord(bulkUpdateReq);

    /**
     * TODO: Throw/Retry on errors
     */
    const [bulkCreateValidRecords, _bulkCreateErrors] = partitionRecordsByError(bulkCreateRes);
    const [bulkUpdateValidRecords, _bulkUpdateErrors] = partitionRecordsByError(bulkUpdateRes);

    /**
     * TODO: Should we check if the records in the
     * arrays are unique?
     */
    return [
      ...recordsWithoutIncreasedCounter,
      ...bulkCreateValidRecords,
      ...bulkUpdateValidRecords,
    ];
  }

  private isTimeWindowPassed(timeWindow: string, counterLastUpdatedAt: string) {
    const parsedDate = dateMath.parse(`now-${timeWindow}`);

    /**
     * TODO: Should we throw?
     */
    if (!parsedDate || !parsedDate.isValid()) {
      return false;
    }

    const counterLastUpdatedAtAsDate = new Date(counterLastUpdatedAt);

    /**
     * TODO: Should we throw?
     */
    if (isNaN(counterLastUpdatedAtAsDate.getTime())) {
      return false;
    }

    return counterLastUpdatedAtAsDate < parsedDate.toDate();
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

  private async upsertCases(
    params: CasesConnectorRunParams,
    casesClient: CasesClient,
    groupedAlertsWithCaseId: Map<string, GroupedAlertsWithCaseId>
  ): Promise<Map<string, GroupedAlertsWithCases>> {
    const bulkCreateReq: BulkCreateCasesRequest['cases'] = [];
    const bulkUpdateCasesResponse: Cases = [];
    const casesMap = new Map<string, GroupedAlertsWithCases>();

    const ids = Array.from(groupedAlertsWithCaseId.values()).map(({ caseId }) => caseId);
    const { cases, errors } = await casesClient.cases.bulkGet({ ids });
    const [closedCases, nonClosedCases] = partition(
      cases,
      (req) => req.status === CaseStatuses.closed
    );

    for (const theCase of nonClosedCases) {
      if (groupedAlertsWithCaseId.has(theCase.id)) {
        const data = groupedAlertsWithCaseId.get(theCase.id) as GroupedAlertsWithCaseId;
        casesMap.set(theCase.id, { ...data, theCase });
      }
    }

    if (errors.length === 0 && closedCases.length === 0) {
      return casesMap;
    }

    if (params.reopenClosedCases && closedCases.length > 0) {
      const bulkUpdateReq = closedCases.map((theCase) => ({
        id: theCase.id,
        version: theCase.version,
        status: CaseStatuses.open,
      }));

      /**
       * TODO: bulkUpdate throws an error. Retry on errors.
       */
      bulkUpdateCasesResponse.concat(await casesClient.cases.bulkUpdate({ cases: bulkUpdateReq }));
    }

    /**
     * TODO: Throw/retry for other errors
     */
    const nonFoundErrors = errors.filter((error) => error.status === 404);

    if (nonFoundErrors.length === 0) {
      return casesMap;
    }

    for (const error of nonFoundErrors) {
      if (groupedAlertsWithCaseId.has(error.caseId)) {
        const data = groupedAlertsWithCaseId.get(error.caseId) as GroupedAlertsWithCaseId;

        bulkCreateReq.push(this.getCreateCaseRequest(params, data));
      }
    }

    /**
     * TODO: bulkCreate throws an error. Retry on errors.
     */
    const bulkCreateCasesResponse = await casesClient.cases.bulkCreate({ cases: bulkCreateReq });

    for (const res of [...bulkCreateCasesResponse.cases, ...bulkUpdateCasesResponse]) {
      if (groupedAlertsWithCaseId.has(res.id)) {
        const data = groupedAlertsWithCaseId.get(res.id) as GroupedAlertsWithCaseId;
        casesMap.set(res.id, { ...data, theCase: res });
      }
    }

    return casesMap;
  }

  private getCreateCaseRequest(
    params: CasesConnectorRunParams,
    groupingData: GroupedAlertsWithCaseId
  ) {
    const { grouping } = groupingData;

    const ruleName = params.rule.ruleUrl
      ? `[${params.rule.name}](${params.rule.ruleUrl})`
      : params.rule.name;

    const groupingDescription = this.getGroupingDescription(grouping);

    const description = `This case is auto-created by ${ruleName}. \n\n Grouping: ${groupingDescription}`;

    const tags = Array.isArray(params.rule.tags) ? params.rule.tags : [];

    /**
     * TODO:
     * 1. Add grouping info to
     * 2. Required custom fields will throw an error when creating a case.
     * We should find a way to fill the custom fields with default values.
     */
    return {
      description,
      tags: ['auto-generated', ...tags],
      /**
       * TODO: Append the counter to the name
       */
      title: `${params.rule.name} (Auto-created)`,
      connector: { id: 'none', name: 'none', type: ConnectorTypes.none, fields: null },
      /**
       * Turn on for Security solution
       */
      settings: { syncAlerts: false },
      owner: params.owner,
    };
  }

  private getGroupingDescription(grouping: GroupedAlerts['grouping']) {
    /**
     * TODO: Handle multi values
     */
    return Object.entries(grouping)
      .map(([key, value]) => {
        const keyAsCodeBlock = `\`${key}\``;
        const valueAsCodeBlock = `\`${value}\``;

        return `${keyAsCodeBlock} equals ${valueAsCodeBlock}`;
      })
      .join(' and ');
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
        concurrency: MAX_CONCURRENT_ES_REQUEST,
      }
    );
  }
}
