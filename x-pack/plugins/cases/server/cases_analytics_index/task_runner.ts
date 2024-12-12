/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import type { CancellableTask, ConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';
import type {
  ElasticsearchClient,
  ISavedObjectsRepository,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { UserActionActions, UserActionTypes } from '../../common/types/domain';
import { AttachmentType } from '../../common';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
} from '../../common/constants';

interface ConstructorArgs {
  taskInstance: ConcreteTaskInstance;
  getSavedOjectClient: () => Promise<ISavedObjectsRepository>;
  getESClient: () => Promise<ElasticsearchClient>;
}

type CaseSORes = SavedObjectsFindResponse<{ title: string }>;
interface AnalyticsIndexCase {
  id: string;
  title: string;
}

interface Alert {
  rule: { name: string; tags: string[] };
  host: { name: string; ip: string };
}

const TOTAL_CASES = 100;

const printMemoryUsage = () => {
  for (const [key, value] of Object.entries(process.memoryUsage())) {
    console.log(`Memory usage by ${key}, ${value / 1000000}MB `);
  }
};

export class CaseAnalyticsIndexSyncTaskRunner implements CancellableTask {
  private readonly taskInstance: ConcreteTaskInstance;
  private readonly getSavedOjectClient: ConstructorArgs['getSavedOjectClient'];
  private readonly getESClient: ConstructorArgs['getESClient'];

  constructor({ taskInstance, getSavedOjectClient, getESClient }: ConstructorArgs) {
    this.taskInstance = taskInstance;
    this.getSavedOjectClient = getSavedOjectClient;
    this.getESClient = getESClient;
  }

  private async getAllCases(): Promise<CaseSORes> {
    const soClient = await this.getSavedOjectClient();
    const cases = await soClient.find<{ title: string }>({
      type: CASE_SAVED_OBJECT,
      perPage: TOTAL_CASES,
      sortField: 'created_at',
      sortOrder: 'asc',
    });

    return cases;
  }

  private async getAttachmentAggregations(cases: CaseSORes): Promise<CaseSORes> {
    const soClient = await this.getSavedOjectClient();
    const references = cases.saved_objects.map(({ id }) => ({
      type: CASE_SAVED_OBJECT,
      id,
    }));

    const attachmentAggs = await soClient.find<{ title: string }>({
      type: CASE_COMMENT_SAVED_OBJECT,
      hasReference: references,
      hasReferenceOperator: 'OR',
      page: 1,
      perPage: 1,
      aggs: {
        references: {
          nested: {
            path: `${CASE_COMMENT_SAVED_OBJECT}.references`,
          },
          aggs: {
            perCase: {
              terms: {
                field: `${CASE_COMMENT_SAVED_OBJECT}.references.id`,
                size: TOTAL_CASES,
              },
              aggs: {
                commentsDoc: {
                  reverse_nested: {},
                  aggs: {
                    attachmentTypes: {
                      terms: {
                        field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.type`,
                      },
                    },
                    totalAlerts: {
                      cardinality: {
                        field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.alertId`,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return attachmentAggs;
  }

  private async getUserActionsAggregations(cases: CaseSORes): Promise<CaseSORes> {
    const soClient = await this.getSavedOjectClient();
    const references = cases.saved_objects.map(({ id }) => ({
      type: CASE_SAVED_OBJECT,
      id,
    }));

    const res = await soClient.find<{ title: string }>({
      type: CASE_USER_ACTION_SAVED_OBJECT,
      hasReference: references,
      hasReferenceOperator: 'OR',
      page: 1,
      perPage: TOTAL_CASES * 3,
      sortField: 'created_at',
      sortOrder: 'asc',
      filter: `${CASE_USER_ACTION_SAVED_OBJECT}.attributes.type: ${UserActionTypes.status} AND ${CASE_USER_ACTION_SAVED_OBJECT}.attributes.action: ${UserActionActions.update}`,
    });

    return res;
  }

  private async getAlertData(cases: CaseSORes): Promise<Alert[]> {
    const soClient = await this.getSavedOjectClient();
    const esClient = await this.getESClient();
    const documents = [];

    const references = cases.saved_objects.map(({ id }) => ({
      type: CASE_SAVED_OBJECT,
      id,
    }));

    const casesAlertMap = new Map<string, string>();

    const startSOAlerts = performance.now();
    const finder = soClient.createPointInTimeFinder<{
      alertId: string | string[];
      index: string | string[];
    }>({
      type: CASE_COMMENT_SAVED_OBJECT,
      hasReference: references,
      perPage: 1000,
      sortField: 'created_at',
      sortOrder: 'asc',
      filter: `${CASE_COMMENT_SAVED_OBJECT}.attributes.type: ${AttachmentType.alert}`,
      fields: ['alertId', 'index'],
    });

    for await (const findResults of finder.find()) {
      for (const alertSO of findResults.saved_objects) {
        const theCaseId = alertSO.references.filter(({ type }) => type === CASE_SAVED_OBJECT)[0].id;
        const alertIds = Array.isArray(alertSO.attributes.alertId)
          ? alertSO.attributes.alertId
          : [alertSO.attributes.alertId];

        const alertIndices = Array.isArray(alertSO.attributes.index)
          ? alertSO.attributes.index
          : [alertSO.attributes.index];

        const alerts = alertIds.map((id, index) => ({
          _id: id,
          _index: alertIndices[index],
        }));

        for (const alert of alerts) {
          casesAlertMap.set(`${alert._id}:${alert._index}`, theCaseId);
          documents.push(alert);
        }
      }
    }

    finder.close();
    const durationSOAlerts = performance.now() - startSOAlerts;
    console.log(`SO alerts data took: ${Math.round(durationSOAlerts)}ms)`);

    const startMgetAlerts = performance.now();
    const res = await esClient.mget(
      {
        docs: documents,
        _source_includes: [
          'kibana.alert.rule.name',
          'kibana.alert.rule.tags',
          'host.name',
          'host.ip',
        ],
      },
      { asStream: true }
    );

    let payload = '';
    res.setEncoding('utf8');
    for await (const chunk of res) {
      payload += chunk;
    }

    JSON.parse(payload);

    const durationMgetAlerts = performance.now() - startMgetAlerts;
    console.log(`Mget alerts took: ${Math.round(durationMgetAlerts)}ms)`);
  }

  private async updateIndex(cases: CaseSORes) {
    const esClient = await this.getESClient();
    const documents = cases.saved_objects.map((theCaseSO) => ({
      id: theCaseSO.id,
      title: theCaseSO.attributes.title,
    }));

    const startAggs = performance.now();
    await this.getAttachmentAggregations(cases);
    const durationAggs = performance.now() - startAggs;
    console.log(`Aggs took: ${Math.round(durationAggs)}ms)`);
    printMemoryUsage();

    const startAlerts = performance.now();
    await this.getAlertData(cases);
    const durationAlerts = performance.now() - startAlerts;
    console.log(`Getting alerting data took: ${Math.round(durationAlerts)}ms)`);
    printMemoryUsage();

    const startBulkUpdate = performance.now();
    const res = await esClient.helpers.bulk({
      datasource: documents,
      onDocument(doc) {
        return [
          { update: { _id: doc.id, _index: '.cases_analytics_index_poc', retry_on_conflict: 3 } },
          { doc_as_upsert: true },
        ];
      },
      onDrop(doc) {
        console.log('error update index', doc.error);
      },
    });

    const durationBulkAlerts = performance.now() - startBulkUpdate;
    console.log(`Bulk updating CAI took: ${Math.round(durationBulkAlerts)}ms)`);
    printMemoryUsage();

    console.log('res bulk update index', res);
  }

  public async run() {
    console.log('Starting CAI sync');
    printMemoryUsage();
    const start = performance.now();

    const startCases = performance.now();
    const cases = await this.getAllCases();
    const durationCases = performance.now() - startCases;
    console.log(`Getting cases took: ${Math.round(durationCases)}ms)`);
    printMemoryUsage();

    await this.updateIndex(cases);

    const duration = performance.now() - start;

    console.log(`Execution took: ${Math.round(duration)}ms)`);
    printMemoryUsage();
    console.log('End of CAI sync');
  }

  public async cancel() {}
}
