/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';
import type { ESTestIndexTool } from '@kbn/alerting-api-integration-helpers';
import { ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import type { Client } from '@elastic/elasticsearch';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import moment from 'moment';
import type { FtrProviderContext, RetryService } from '@kbn/ftr-common-functional-services';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server/saved_objects';
import type { TaskManagerDoc } from '../../../../../common/lib';
import { getEventLog } from '../../../../../common/lib';
import {
  DOCUMENT_REFERENCE,
  DOCUMENT_SOURCE,
  createEsDocument,
} from '../../../../../spaces_only/tests/alerting/create_test_data';

export const TEST_ACTIONS_INDEX = 'alerting-backfill-test-data';

export const testDocTimestamps = [
  // before first backfill run
  moment().utc().subtract(14, 'days').toISOString(),

  // backfill execution set 1
  moment().utc().startOf('day').subtract(13, 'days').add(10, 'minutes').toISOString(),
  moment().utc().startOf('day').subtract(13, 'days').add(11, 'minutes').toISOString(),
  moment().utc().startOf('day').subtract(13, 'days').add(12, 'minutes').toISOString(),

  // backfill execution set 2
  moment().utc().startOf('day').subtract(12, 'days').add(20, 'minutes').toISOString(),

  // backfill execution set 3
  moment().utc().startOf('day').subtract(11, 'days').add(30, 'minutes').toISOString(),
  moment().utc().startOf('day').subtract(11, 'days').add(31, 'minutes').toISOString(),
  moment().utc().startOf('day').subtract(11, 'days').add(32, 'minutes').toISOString(),
  moment().utc().startOf('day').subtract(11, 'days').add(33, 'minutes').toISOString(),
  moment().utc().startOf('day').subtract(11, 'days').add(34, 'minutes').toISOString(),

  // backfill execution set 4 purposely left empty

  // after last backfill
  moment().utc().startOf('day').subtract(9, 'days').add(40, 'minutes').toISOString(),
  moment().utc().startOf('day').subtract(9, 'days').add(41, 'minutes').toISOString(),
];

export async function indexTestDocs(es: Client, esTestIndexTool: ESTestIndexTool) {
  await asyncForEach(testDocTimestamps, async (timestamp: string) => {
    await createEsDocument(es, new Date(timestamp).valueOf(), 1, ES_TEST_INDEX_NAME);
  });

  await esTestIndexTool.waitForDocs(DOCUMENT_SOURCE, DOCUMENT_REFERENCE, testDocTimestamps.length);
}

export async function waitForEventLogDocs(
  retry: RetryService,
  getService: FtrProviderContext['getService'],
  id: string,
  spaceId: string,
  actions: Map<string, { gte: number } | { equal: number }>,
  collapseByExecutionUUid?: boolean
) {
  return await retry.try(async () => {
    return await getEventLog({
      getService,
      spaceId,
      type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
      id,
      provider: 'alerting',
      actions,
      collapseByExecutionUUid,
    });
  });
}

export async function getScheduledTask(es: Client, id: string): Promise<TaskManagerDoc> {
  const scheduledTask = await es.get<TaskManagerDoc>({
    id: `task:${id}`,
    index: '.kibana_task_manager',
  });
  return scheduledTask._source!;
}

export async function queryForAlertDocs<T>(
  es: Client,
  index: string
): Promise<Array<SearchHit<T>>> {
  const searchResult = await es.search({
    index,
    sort: [{ ['kibana.alert.original_time']: { order: 'asc' } }],
    query: { match_all: {} },
  });
  return searchResult.hits.hits as Array<SearchHit<T>>;
}

export async function searchScheduledTask(es: Client, id: string) {
  const searchResult = await es.search({
    index: '.kibana_task_manager',
    query: {
      bool: {
        must: [
          {
            term: {
              'task.id': `task:${id}`,
            },
          },
          {
            terms: {
              'task.scope': ['alerting'],
            },
          },
        ],
      },
    },
  });

  // @ts-expect-error
  return searchResult.hits.total.value;
}

export function getSecurityRule(overwrites = {}) {
  return {
    name: 'test siem query rule with actions',
    rule_type_id: 'siem.queryRule',
    consumer: 'siem',
    enabled: true,
    actions: [],
    schedule: { interval: '24h' },
    params: {
      author: [],
      description: 'test',
      falsePositives: [],
      from: 'now-86460s',
      ruleId: '31c54f10-9d3b-45a8-b064-b92e8c6fcbe7',
      immutable: false,
      license: '',
      outputIndex: '',
      meta: { from: '1m', kibana_siem_app_url: 'https://localhost:5601/app/security' },
      maxSignals: 20,
      riskScore: 21,
      riskScoreMapping: [],
      severity: 'low',
      severityMapping: [],
      threat: [],
      to: 'now',
      references: [],
      version: 1,
      exceptionsList: [],
      relatedIntegrations: [],
      requiredFields: [],
      setup: '',
      type: 'query',
      language: 'kuery',
      index: [ES_TEST_INDEX_NAME],
      query: `source:${DOCUMENT_SOURCE}`,
      filters: [],
    },
    ...overwrites,
  };
}
