/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESTestIndexTool, ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { STACK_AAD_INDEX_NAME } from '@kbn/stack-alerts-plugin/server/rule_types';
import type { FtrProviderContext } from '../../../../../../common/ftr_provider_context';
import { Spaces } from '../../../../../scenarios';
import type { ObjectRemover } from '../../../../../../common/lib';
import { getUrlPrefix } from '../../../../../../common/lib';
import { createEsDocuments, createEsDocumentsWithGroups } from '../../../create_test_data';

export const RULE_TYPE_ID = '.es-query';
export const CONNECTOR_TYPE_ID = '.index';
export const ES_TEST_INDEX_SOURCE = 'builtin-rule:es-query';
export const ES_TEST_INDEX_REFERENCE = '-na-';
export const ES_TEST_OUTPUT_INDEX_NAME = `${ES_TEST_INDEX_NAME}-output`;
export const ES_TEST_DATA_STREAM_NAME = 'test-data-stream';

export const RULE_INTERVALS_TO_WRITE = 5;
export const RULE_INTERVAL_SECONDS = 6;
export const RULE_INTERVAL_MILLIS = RULE_INTERVAL_SECONDS * 1000;
export const ES_GROUPS_TO_WRITE = 3;

export async function createConnector(
  supertest: any,
  objectRemover: ObjectRemover,
  index: string
): Promise<string> {
  const { body: createdConnector } = await supertest
    .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
    .set('kbn-xsrf', 'foo')
    .send({
      name: 'index action for es query FT',
      connector_type_id: CONNECTOR_TYPE_ID,
      config: {
        index,
      },
      secrets: {},
    })
    .expect(200);

  const connectorId = createdConnector.id;
  objectRemover.add(Spaces.space1.id, connectorId, 'connector', 'actions');

  return connectorId;
}

export interface CreateRuleParams {
  name: string;
  size?: number;
  thresholdComparator?: string;
  threshold?: number[];
  timeWindowSize?: number;
  esQuery?: string;
  timeField?: string;
  searchConfiguration?: unknown;
  esqlQuery?: unknown;
  searchType?: 'searchSource' | 'esqlQuery';
  notifyWhen?: string;
  indexName?: string;
  aggType?: string;
  aggField?: string;
  groupBy?: string;
  termField?: string | string[];
  termSize?: number;
  excludeHitsFromPreviousRun?: boolean;
  sourceFields?: Array<{ label: string; searchPath: string }>;
  wrapInBrackets?: boolean;
}

export async function createRule(
  supertest: any,
  objectRemover: ObjectRemover,
  connectorId: string,
  params: CreateRuleParams,
  ruleParams: Partial<CreateRuleParams>
): Promise<string> {
  const action = {
    id: connectorId,
    group: 'query matched',
    params: {
      documents: [
        {
          source: ES_TEST_INDEX_SOURCE,
          reference: ES_TEST_INDEX_REFERENCE,
          params: {
            name: '{{{rule.name}}}',
            value: '{{{context.value}}}',
            title: '{{{context.title}}}',
            message: '{{{context.message}}}',
          },
          hits: params.wrapInBrackets ? '[{{context.hits}}]' : '{{context.hits}}',
          date: '{{{context.date}}}',
          previousTimestamp: '{{{state.latestTimestamp}}}',
          grouping: '{{context.grouping}}',
        },
      ],
    },
  };

  const recoveryAction = {
    id: connectorId,
    group: 'recovered',
    params: {
      documents: [
        {
          source: ES_TEST_INDEX_SOURCE,
          reference: ES_TEST_INDEX_REFERENCE,
          params: {
            name: '{{{rule.name}}}',
            value: '{{{context.value}}}',
            title: '{{{context.title}}}',
            message: '{{{context.message}}}',
          },
          hits: params.wrapInBrackets ? '[{{context.hits}}]' : '{{context.hits}}',
          date: '{{{context.date}}}',
          grouping: '{{context.grouping}}',
        },
      ],
    },
  };

  const { body: createdRule } = await supertest
    .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
    .set('kbn-xsrf', 'foo')
    .send({
      name: params.name,
      consumer: 'alerts',
      enabled: true,
      rule_type_id: RULE_TYPE_ID,
      schedule: { interval: '1d' },
      actions: [action, recoveryAction],
      notify_when: params.notifyWhen || 'onActiveAlert',
      params: {
        size: 100,
        timeWindowSize: 1,
        timeWindowUnit: 'h',
        thresholdComparator: params.thresholdComparator,
        threshold: params.threshold,
        searchType: params.searchType,
        aggType: params.aggType,
        groupBy: params.groupBy,
        aggField: params.aggField,
        termField: params.termField,
        termSize: params.termSize,
        sourceFields: [],
        ...(params.excludeHitsFromPreviousRun !== undefined && {
          excludeHitsFromPreviousRun: params.excludeHitsFromPreviousRun,
        }),
        ...ruleParams,
      },
    })
    .expect(200);

  const ruleId = createdRule.id;
  objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

  return ruleId;
}

export async function createDSLRule(
  supertest: any,
  objectRemover: ObjectRemover,
  connectorId: string,
  params: CreateRuleParams
): Promise<string> {
  const esQuery = params.esQuery ?? `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`;
  const ruleParams = {
    index: [params.indexName || ES_TEST_INDEX_NAME],
    timeField: params.timeField || 'date',
    esQuery,
  };

  return await createRule(supertest, objectRemover, connectorId, params, ruleParams);
}

export async function createSearchSourceRule(
  supertest: any,
  objectRemover: ObjectRemover,
  connectorId: string,
  params: CreateRuleParams,
  dataViewId?: string,
  query: string = ''
): Promise<string> {
  const ruleParams = {
    searchConfiguration: {
      query: { query, language: 'kuery' },
      index: dataViewId,
      filter: [],
    },
  };

  return await createRule(
    supertest,
    objectRemover,
    connectorId,
    { ...params, searchType: 'searchSource' },
    ruleParams
  );
}

export async function createESQLRule(
  supertest: any,
  objectRemover: ObjectRemover,
  connectorId: string,
  params: CreateRuleParams,
  esqlQuery: string
): Promise<string> {
  const ruleParams = {
    threshold: [0],
    thresholdComparator: '>',
    timeField: params.timeField || 'date',
    esqlQuery: { esql: esqlQuery },
  };

  return await createRule(
    supertest,
    objectRemover,
    connectorId,
    { ...params, searchType: 'esqlQuery' },
    ruleParams
  );
}

export function getRuleServices(getService: FtrProviderContext['getService']) {
  const retry = getService('retry');
  const es = getService('es');
  const esTestIndexTool = new ESTestIndexTool(es, retry);
  const esTestIndexToolOutput = new ESTestIndexTool(es, retry, ES_TEST_OUTPUT_INDEX_NAME);
  const esTestIndexToolDataStream = new ESTestIndexTool(es, retry, ES_TEST_DATA_STREAM_NAME);
  const esTestIndexToolAAD = new ESTestIndexTool(
    es,
    retry,
    `.internal.alerts-${STACK_AAD_INDEX_NAME}.alerts-default-000001`
  );

  async function createEsDocumentsInGroups(
    groups: number,
    endDate: string,
    indexTool: ESTestIndexTool = esTestIndexTool,
    indexName: string = ES_TEST_INDEX_NAME
  ) {
    await createEsDocuments(
      es,
      indexTool,
      endDate,
      RULE_INTERVALS_TO_WRITE,
      RULE_INTERVAL_MILLIS,
      groups,
      indexName
    );
  }

  async function createGroupedEsDocumentsInGroups(
    groups: number,
    endDate: string,
    indexTool: ESTestIndexTool = esTestIndexTool,
    indexName: string = ES_TEST_INDEX_NAME
  ) {
    await createEsDocumentsWithGroups({
      es,
      esTestIndexTool: indexTool,
      endDate,
      intervals: RULE_INTERVALS_TO_WRITE,
      intervalMillis: RULE_INTERVAL_MILLIS,
      groups,
      indexName,
    });
  }

  async function waitForDocs(count: number): Promise<any[]> {
    return await esTestIndexToolOutput.waitForDocs(
      ES_TEST_INDEX_SOURCE,
      ES_TEST_INDEX_REFERENCE,
      count
    );
  }

  async function getAllAADDocs(size: number, sort?: string): Promise<any> {
    return await esTestIndexToolAAD.getAll(size, sort);
  }

  async function getAADDocsForRule(ruleId: string, size: number, sort?: string): Promise<any> {
    return await retry.try(async () => {
      const result = await es.search(
        {
          index: `.alerts-${STACK_AAD_INDEX_NAME}.alerts-default`,
          size: 100,
          sort: sort ? [{ [sort]: 'asc' as const }] : undefined,
          query: {
            term: {
              'kibana.alert.rule.uuid': ruleId,
            },
          },
        },
        { meta: true }
      );
      const value =
        typeof result.body.hits.total === 'number'
          ? result.body.hits.total
          : result.body.hits.total?.value;
      if (value! < size) {
        throw new Error(`Expected ${size} alert docs but received ${value}.`);
      }
      return result;
    });
  }

  async function waitForAADDocs(numDocs: number = 1) {
    return await retry.try(async () => {
      const searchResult = await getAllAADDocs(numDocs);
      const value =
        typeof searchResult.body.hits.total === 'number'
          ? searchResult.body.hits.total
          : searchResult.body.hits.total?.value;
      if (value! < numDocs) {
        throw new Error(`Expected ${numDocs} alert docs but received ${value}.`);
      }
      return searchResult.body.hits.hits;
    });
  }

  async function removeAllAADDocs(): Promise<any> {
    return await esTestIndexToolAAD.removeAll();
  }

  async function deleteDocs() {
    await Promise.all([
      es.deleteByQuery({
        index: ES_TEST_INDEX_NAME,
        query: { match_all: {} },
        conflicts: 'proceed',
      }),
      es.deleteByQuery({
        index: ES_TEST_OUTPUT_INDEX_NAME,
        query: { match_all: {} },
        conflicts: 'proceed',
      }),
    ]);
  }

  function getEndDate(millisOffset: number = 0) {
    const endDateMillis = Date.now() + millisOffset;
    return new Date(endDateMillis).toISOString();
  }

  return {
    retry,
    es,
    esTestIndexTool,
    esTestIndexToolOutput,
    esTestIndexToolDataStream,
    createEsDocumentsInGroups,
    createGroupedEsDocumentsInGroups,
    waitForDocs,
    getAllAADDocs,
    getAADDocsForRule,
    waitForAADDocs,
    removeAllAADDocs,
    deleteDocs,
    getEndDate,
  };
}
