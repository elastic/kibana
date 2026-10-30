/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type SuperTest from 'supertest';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import { INTERNAL_CASES_SPACE_SETTINGS_URL } from '@kbn/cases-plugin/common/constants';
import type {
  CaseStatusDefinition,
  CasesSpaceSettings,
} from '@kbn/cases-plugin/common/types/domain';
import { DEFAULT_CASE_STATUSES } from '@kbn/cases-plugin/common/utils/statuses';

export const customStatus = (
  overrides: Partial<CaseStatusDefinition> &
    Pick<CaseStatusDefinition, 'key' | 'label' | 'category'>
): CaseStatusDefinition => ({
  color: 'accent',
  order: 10,
  isDefault: false,
  disabled: false,
  ...overrides,
});

export const TRIAGE = customStatus({
  key: 'triage',
  label: 'Triage',
  category: 'not_started',
  order: 3,
});

export const DUPLICATE = customStatus({
  key: 'duplicate',
  label: 'Duplicate',
  category: 'done',
  order: 4,
});

export const SETTINGS_WITH_CUSTOM_STATUSES: CasesSpaceSettings = {
  statuses: [...DEFAULT_CASE_STATUSES, TRIAGE, DUPLICATE],
};

export const getSpaceSettings = async ({
  supertest,
  expectedHttpCode = 200,
}: {
  supertest: SuperTest.Agent;
  expectedHttpCode?: number;
}): Promise<CasesSpaceSettings> => {
  const { body } = await supertest
    .get(INTERNAL_CASES_SPACE_SETTINGS_URL)
    .set('kbn-xsrf', 'true')
    .set('x-elastic-internal-origin', 'kibana')
    .expect(expectedHttpCode);

  return body;
};

export const putSpaceSettings = async ({
  supertest,
  settings,
  expectedHttpCode = 200,
}: {
  supertest: SuperTest.Agent;
  settings: object;
  expectedHttpCode?: number;
}) => {
  const { body } = await supertest
    .put(INTERNAL_CASES_SPACE_SETTINGS_URL)
    .set('kbn-xsrf', 'true')
    .set('x-elastic-internal-origin', 'kibana')
    .send(settings)
    .expect(expectedHttpCode);

  return body;
};

/** Makes the case look like one written before custom statuses: no `status_key`. */
export const removeStatusKey = async (es: Client, caseId: string): Promise<void> => {
  await es.updateByQuery({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    refresh: true,
    wait_for_completion: true,
    conflicts: 'proceed',
    query: { term: { _id: `cases:${caseId}` } },
    script: { source: "ctx._source.cases.remove('status_key')", lang: 'painless' },
  });
};
