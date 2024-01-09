/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stringify from 'json-stable-stringify';
import pMap from 'p-map';
import { pick } from 'lodash';
import dateMath from '@kbn/datemath';
import { CaseStatuses } from '@kbn/cases-components';
import type { SavedObjectError } from '@kbn/core-saved-objects-common';
import { MAX_ALERTS_PER_CASE } from '../../../common/constants';
import type { BulkCreateCasesRequest } from '../../../common/types/api';
import type { Case } from '../../../common';
import { ConnectorTypes, AttachmentType } from '../../../common';
import { MAX_CONCURRENT_ES_REQUEST } from './constants';
import type { BulkCreateOracleRecordRequest, CasesConnectorRunParams, OracleRecord } from './types';
import type { CasesOracleService } from './cases_oracle_service';
import { partitionByNonFoundErrors, partitionRecordsByError } from './utils';
import type { CasesService } from './cases_service';
import type { CasesClient } from '../../client';
import type { BulkCreateArgs as BulkCreateAlertsReq } from '../../client/attachments/types';
import { CasesConnectorError } from './cases_connector_error';

interface CasesConnectorExecutorParams {
  casesOracleService: CasesOracleService;
  casesService: CasesService;
  casesClient: CasesClient;
}

interface GroupedAlerts {
  alerts: CasesConnectorRunParams['alerts'];
  grouping: Record<string, unknown>;
}

type GroupedAlertsWithOracleKey = GroupedAlerts & { oracleKey: string };
type GroupedAlertsWithOracleRecords = GroupedAlertsWithOracleKey & { oracleRecord: OracleRecord };
type GroupedAlertsWithCaseId = GroupedAlertsWithOracleRecords & { caseId: string };
type GroupedAlertsWithCases = GroupedAlertsWithCaseId & { theCase: Case };

export class CasesConnectorExecutor {
  private readonly casesOracleService: CasesOracleService;
  private readonly casesService: CasesService;
  private readonly casesClient: CasesClient;

  constructor({ casesOracleService, casesService, casesClient }: CasesConnectorExecutorParams) {
    this.casesOracleService = casesOracleService;
    this.casesService = casesService;
    this.casesClient = casesClient;
  }

  public async execute(params: CasesConnectorRunParams) {
    const { alerts, groupingBy } = params;

    const groupedAlerts = this.groupAlerts({ alerts, groupingBy });

    /**
     * Based on the rule ID, the grouping, the owner, the space ID,
     * the oracle record ID is generated
     */
    const groupedAlertsWithOracleKey = this.generateOracleKeys(params, groupedAlerts);

    /**
     * TODO: Add circuit breakers to the number of oracles they can be created or retrieved
     */

    /**
     * Gets all records by the IDs that produces in generateOracleKeys.
     * If a record does not exist it will create the record.
     * A record does not exist if it is the first time the connector run for a specific grouping.
     * The returned map will contain all records old and new.
     */
    const oracleRecordsMap = await this.upsertOracleRecords(groupedAlertsWithOracleKey);

    /**
     * If the time window has passed for a case we need to create a new case.
     * To do that we need to increase the record counter by one. Increasing the
     * counter will generate a new case ID for the same grouping.
     * The returned map contain all records with their counters updated correctly
     */
    const oracleRecordMapWithTimeWindowHandled = await this.handleTimeWindow(
      params,
      oracleRecordsMap
    );

    /**
     * Based on the rule ID, the grouping, the owner, the space ID,
     * and the counter of the oracle record the case ID is generated
     */
    const groupedAlertsWithCaseId = this.generateCaseIds(
      params,
      oracleRecordMapWithTimeWindowHandled
    );

    /**
     * Gets all records by the IDs that produces in generateCaseIds.
     * If a case does not exist it will create the case.
     * A case does not exist if it is the first time the connector run for a specific grouping
     * or the time window has elapsed and a new one should be created for the same grouping.
     * The returned map will contain all cases old and new.
     */
    const groupedAlertsWithCases = await this.upsertCases(params, groupedAlertsWithCaseId);

    /**
     * A user can configure how to handle closed cases. Based on the configuration
     * we open the closed cases by updating their status or we create new cases by
     * increasing the counter of the corresponding oracle record, generating the new
     * case ID, and creating the new case.
     * The map contains all cases updated and new without any remaining closed case.
     */
    const groupedAlertsWithClosedCasesHandled = await this.handleClosedCases(
      params,
      groupedAlertsWithCases
    );

    /**
     * Now that all cases are fetched or created per grouping, we attach the alerts
     * to the corresponding cases.
     */
    await this.attachAlertsToCases(groupedAlertsWithClosedCasesHandled, params);
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
    groupedAlertsWithOracleKey: Map<string, GroupedAlertsWithOracleKey>
  ): Promise<Map<string, GroupedAlertsWithOracleRecords>> {
    const bulkCreateReq: BulkCreateOracleRecordRequest = [];
    const oracleRecordMap = new Map<string, GroupedAlertsWithOracleRecords>();

    const addRecordToMap = (oracleRecords: OracleRecord[]) => {
      for (const record of oracleRecords) {
        if (groupedAlertsWithOracleKey.has(record.id)) {
          const data = groupedAlertsWithOracleKey.get(record.id) as GroupedAlertsWithCaseId;
          oracleRecordMap.set(record.id, { ...data, oracleRecord: record });
        }
      }
    };

    const ids = Array.from(groupedAlertsWithOracleKey.values()).map(({ oracleKey }) => oracleKey);

    const bulkGetRes = await this.casesOracleService.bulkGetRecords(ids);
    const [bulkGetValidRecords, bulkGetRecordsErrors] = partitionRecordsByError(bulkGetRes);

    addRecordToMap(bulkGetValidRecords);

    if (bulkGetRecordsErrors.length === 0) {
      return oracleRecordMap;
    }

    const [nonFoundErrors, restOfErrors] = partitionByNonFoundErrors(bulkGetRecordsErrors);

    this.handleAndThrowErrors(restOfErrors);

    if (nonFoundErrors.length === 0) {
      return oracleRecordMap;
    }

    for (const error of nonFoundErrors) {
      if (error.id && groupedAlertsWithOracleKey.has(error.id)) {
        const record = groupedAlertsWithOracleKey.get(error.id);
        bulkCreateReq.push({
          recordId: error.id,
          // TODO: Add the rule info
          payload: { cases: [], rules: [], grouping: record?.grouping ?? {} },
        });
      }
    }

    const bulkCreateRes = await this.casesOracleService.bulkCreateRecord(bulkCreateReq);
    const [bulkCreateValidRecords, bulkCreateErrors] = partitionRecordsByError(bulkCreateRes);

    this.handleAndThrowErrors(bulkCreateErrors);

    addRecordToMap(bulkCreateValidRecords);

    return oracleRecordMap;
  }

  private async handleTimeWindow(
    params: CasesConnectorRunParams,
    oracleRecordMap: Map<string, GroupedAlertsWithOracleRecords>
  ) {
    const { timeWindow } = params;
    const oracleRecordMapWithIncreasedCounters = new Map(oracleRecordMap);

    const recordsToIncreaseCounter = Array.from(oracleRecordMap.values())
      .filter(({ oracleRecord }) =>
        this.isTimeWindowPassed(timeWindow, oracleRecord.updatedAt ?? oracleRecord.createdAt)
      )
      .map(({ oracleRecord }) => oracleRecord);

    const bulkUpdateValidRecords = await this.increaseOracleRecordCounter(recordsToIncreaseCounter);

    for (const res of bulkUpdateValidRecords) {
      if (oracleRecordMap.has(res.id)) {
        const data = oracleRecordMap.get(res.id) as GroupedAlertsWithOracleRecords;
        oracleRecordMapWithIncreasedCounters.set(res.id, { ...data, oracleRecord: res });
      }
    }

    return oracleRecordMapWithIncreasedCounters;
  }

  private async increaseOracleRecordCounter(
    oracleRecords: OracleRecord[]
  ): Promise<OracleRecord[]> {
    if (oracleRecords.length === 0) {
      return [];
    }

    const bulkUpdateReq = oracleRecords.map((record) => ({
      recordId: record.id,
      version: record.version,
      /**
       * TODO: Add new cases or any other related info
       */
      payload: { counter: record.counter + 1 },
    }));

    const bulkUpdateRes = await this.casesOracleService.bulkUpdateRecord(bulkUpdateReq);
    const [bulkUpdateValidRecords, bulkUpdateErrors] = partitionRecordsByError(bulkUpdateRes);

    this.handleAndThrowErrors(bulkUpdateErrors);

    return bulkUpdateValidRecords;
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
    groupedAlertsWithOracleRecords: Map<string, GroupedAlertsWithOracleRecords>
  ): Map<string, GroupedAlertsWithCaseId> {
    const { rule, owner } = params;

    /**
     * TODO: Take spaceId from the actions framework
     */
    const spaceId = 'default';

    const casesMap = new Map<string, GroupedAlertsWithCaseId>();

    for (const [recordId, entry] of groupedAlertsWithOracleRecords.entries()) {
      const caseId = this.casesService.getCaseId({
        ruleId: rule.id,
        grouping: entry.grouping,
        owner,
        spaceId,
        counter: entry.oracleRecord.counter,
      });

      casesMap.set(caseId, {
        caseId,
        alerts: entry.alerts,
        grouping: entry.grouping,
        oracleKey: recordId,
        oracleRecord: entry.oracleRecord,
      });
    }

    return casesMap;
  }

  private async upsertCases(
    params: CasesConnectorRunParams,
    groupedAlertsWithCaseId: Map<string, GroupedAlertsWithCaseId>
  ): Promise<Map<string, GroupedAlertsWithCases>> {
    const bulkCreateReq: BulkCreateCasesRequest['cases'] = [];
    const casesMap = new Map<string, GroupedAlertsWithCases>();

    const ids = Array.from(groupedAlertsWithCaseId.values()).map(({ caseId }) => caseId);
    const { cases, errors } = await this.casesClient.cases.bulkGet({ ids });

    for (const theCase of cases) {
      if (groupedAlertsWithCaseId.has(theCase.id)) {
        const data = groupedAlertsWithCaseId.get(theCase.id) as GroupedAlertsWithCaseId;
        casesMap.set(theCase.id, { ...data, theCase });
      }
    }

    if (errors.length === 0) {
      return casesMap;
    }

    const [nonFoundErrors, restOfErrors] = partitionByNonFoundErrors(
      /**
       * The format of error returned from bulkGet is different
       * from what expected. We need to transform to a SavedObjectError
       */
      errors.map((error) => ({ ...error, statusCode: error.status ?? 500, id: error.caseId }))
    );

    this.handleAndThrowErrors(restOfErrors);

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
     * cases.bulkCreate throws an error on errors
     */
    const bulkCreateCasesResponse = await this.casesClient.cases.bulkCreate({
      cases: bulkCreateReq,
    });

    for (const theCase of bulkCreateCasesResponse.cases) {
      if (groupedAlertsWithCaseId.has(theCase.id)) {
        const data = groupedAlertsWithCaseId.get(theCase.id) as GroupedAlertsWithCaseId;
        casesMap.set(theCase.id, { ...data, theCase });
      }
    }

    return casesMap;
  }

  private getCreateCaseRequest(
    params: CasesConnectorRunParams,
    groupingData: GroupedAlertsWithCaseId
  ): BulkCreateCasesRequest['cases'][number] {
    const { grouping, caseId } = groupingData;

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
      id: caseId,
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

  private async handleClosedCases(
    params: CasesConnectorRunParams,
    casesMap: Map<string, GroupedAlertsWithCases>
  ) {
    const entriesWithClosedCases = Array.from(casesMap.values()).filter(
      (theCase) => theCase.theCase.status === CaseStatuses.closed
    );

    if (entriesWithClosedCases.length === 0) {
      return casesMap;
    }

    const res = params.reopenClosedCases
      ? await this.reopenClosedCases(entriesWithClosedCases, casesMap)
      : await this.createNewCasesOutOfClosedCases(params, entriesWithClosedCases, casesMap);

    /**
     * The initial map contained the closed cases. We need to remove them to
     * avoid attaching alerts to a close case
     */
    return new Map([...res].filter(([_, record]) => record.theCase.status !== CaseStatuses.closed));
  }

  private async reopenClosedCases(
    closedCasesEntries: GroupedAlertsWithCases[],
    casesMap: Map<string, GroupedAlertsWithCases>
  ): Promise<Map<string, GroupedAlertsWithCases>> {
    const casesMapWithClosedCasesOpened = new Map(casesMap);

    const bulkUpdateReq = closedCasesEntries.map((entry) => ({
      id: entry.theCase.id,
      version: entry.theCase.version,
      status: CaseStatuses.open,
    }));

    /**
     * cases.bulkUpdate throws an error on errors
     */
    const bulkUpdateCasesResponse = await this.casesClient.cases.bulkUpdate({
      cases: bulkUpdateReq,
    });

    for (const res of bulkUpdateCasesResponse) {
      if (casesMap.has(res.id)) {
        const data = casesMap.get(res.id) as GroupedAlertsWithCases;
        casesMapWithClosedCasesOpened.set(res.id, { ...data, theCase: res });
      }
    }

    return casesMapWithClosedCasesOpened;
  }

  private async createNewCasesOutOfClosedCases(
    params: CasesConnectorRunParams,
    closedCasesEntries: GroupedAlertsWithCases[],
    casesMap: Map<string, GroupedAlertsWithCases>
  ): Promise<Map<string, GroupedAlertsWithCases>> {
    const casesMapWithNewCases = new Map(casesMap);
    const casesMapAsArray = Array.from(casesMap.values());

    const findEntryByOracleRecord = (oracleId: string) => {
      return casesMapAsArray.find((record) => record.oracleRecord.id === oracleId);
    };

    const bulkUpdateOracleValidRecords = await this.increaseOracleRecordCounter(
      closedCasesEntries.map((entry) => entry.oracleRecord)
    );

    const groupedAlertsWithOracleRecords = new Map<string, GroupedAlertsWithOracleRecords>();

    for (const record of bulkUpdateOracleValidRecords) {
      const foundRecord = findEntryByOracleRecord(record.id);

      if (foundRecord) {
        groupedAlertsWithOracleRecords.set(record.id, {
          oracleKey: record.id,
          oracleRecord: foundRecord.oracleRecord,
          alerts: foundRecord.alerts,
          grouping: foundRecord.grouping,
        });
      }
    }

    const groupedAlertsWithCaseId = this.generateCaseIds(params, groupedAlertsWithOracleRecords);
    const bulkCreateReq = Array.from(groupedAlertsWithCaseId.values()).map((record) =>
      this.getCreateCaseRequest(params, record)
    );

    /**
     * cases.bulkCreate throws an error on errors
     */
    const bulkCreateCasesResponse = await this.casesClient.cases.bulkCreate({
      cases: bulkCreateReq,
    });

    for (const theCase of bulkCreateCasesResponse.cases) {
      if (groupedAlertsWithCaseId.has(theCase.id)) {
        const data = groupedAlertsWithCaseId.get(theCase.id) as GroupedAlertsWithCaseId;
        casesMapWithNewCases.set(theCase.id, { ...data, theCase });
      }
    }

    return casesMapWithNewCases;
  }

  private async attachAlertsToCases(
    groupedAlertsWithCases: Map<string, GroupedAlertsWithCases>,
    params: CasesConnectorRunParams
  ): Promise<void> {
    const { rule } = params;

    /**
     * TODO: Log that we could not attach the alerts to the cases
     * that have reached out the limit
     */
    const casesUnderAlertLimit = Array.from(groupedAlertsWithCases.values()).filter(
      ({ theCase, alerts }) => theCase.totalAlerts + alerts.length <= MAX_ALERTS_PER_CASE
    );

    const bulkCreateAlertsRequest: BulkCreateAlertsReq[] = casesUnderAlertLimit.map(
      ({ theCase, alerts }) => ({
        caseId: theCase.id,
        attachments: alerts.map((alert) => ({
          type: AttachmentType.alert,
          alertId: alert._id,
          index: alert._index,
          rule: { id: rule.id, name: rule.name },
          owner: theCase.owner,
        })),
      })
    );

    await pMap(
      bulkCreateAlertsRequest,
      /**
       * attachments.bulkCreate throws an error on errors
       */
      (req: BulkCreateAlertsReq) => this.casesClient.attachments.bulkCreate(req),
      {
        concurrency: MAX_CONCURRENT_ES_REQUEST,
      }
    );
  }

  private handleAndThrowErrors(errors: SavedObjectError[]) {
    if (errors.length === 0) {
      return;
    }

    const firstError = errors[0];
    const message = `${firstError.error}: ${firstError.message}`;

    throw new CasesConnectorError(message, firstError.statusCode);
  }
}
