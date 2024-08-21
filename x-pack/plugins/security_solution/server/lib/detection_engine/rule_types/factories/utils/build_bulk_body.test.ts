/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sampleDocWithNonEcsCompliantFields } from '../../__mocks__/es_results';
import { buildBulkBody } from './build_bulk_body';
import { getCompleteRuleMock, getEsqlRuleParams } from '../../../rule_schema/mocks';
import { ruleExecutionLogMock } from '../../../rule_monitoring/mocks';

const SPACE_ID = 'space';
const publicBaseUrl = 'testKibanaBasePath.com';
const alertUuid = 'test-uuid';
const docId = 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71';
const ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();

describe('buildBulkBody', () => {
  test('should strip non-ECS compliant sub-fields of `event.action` field', () => {
    const doc = sampleDocWithNonEcsCompliantFields(docId, {
      'event.action': 'process',
      'event.action.keyword': 'process',
    });
    const completeRule = getCompleteRuleMock(getEsqlRuleParams());
    const buildReasonMessageStub = jest.fn();
    const alert = buildBulkBody(
      SPACE_ID,
      completeRule,
      doc,
      'missingFields',
      [],
      true,
      buildReasonMessageStub,
      [],
      undefined,
      ruleExecutionLogger,
      alertUuid,
      publicBaseUrl
    );

    expect(alert['kibana.alert.original_event.action']).toEqual('process');
    expect(alert['kibana.alert.original_event.action.keyword']).toBeUndefined();
  });
});
