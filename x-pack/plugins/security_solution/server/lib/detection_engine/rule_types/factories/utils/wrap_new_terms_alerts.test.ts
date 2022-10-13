/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_UUID } from '@kbn/rule-data-utils';
import { ALERT_NEW_TERMS } from '../../../../../../common/field_maps/field_names';
import { getCompleteRuleMock, getNewTermsRuleParams } from '../../../rule_schema/mocks';
import { sampleDocNoSortIdWithTimestamp } from '../../../signals/__mocks__/es_results';
import { wrapNewTermsAlerts } from './wrap_new_terms_alerts';

const docId = 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71';
describe('wrapNewTermsAlerts', () => {
  test('should create an alert with the correct _id from a document', () => {
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const completeRule = getCompleteRuleMock(getNewTermsRuleParams());
    const alerts = wrapNewTermsAlerts({
      eventsAndTerms: [{ event: doc, newTerms: ['127.0.0.1'] }],
      spaceId: 'default',
      mergeStrategy: 'missingFields',
      completeRule,
      indicesToQuery: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    });

    expect(alerts[0]._id).toEqual('a36d9fe6fe4b2f65058fb1a487733275f811af58');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('a36d9fe6fe4b2f65058fb1a487733275f811af58');
    expect(alerts[0]._source[ALERT_NEW_TERMS]).toEqual(['127.0.0.1']);
  });

  test('should create an alert with a different _id if the space is different', () => {
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const completeRule = getCompleteRuleMock(getNewTermsRuleParams());
    const alerts = wrapNewTermsAlerts({
      eventsAndTerms: [{ event: doc, newTerms: ['127.0.0.1'] }],
      spaceId: 'otherSpace',
      mergeStrategy: 'missingFields',
      completeRule,
      indicesToQuery: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    });

    expect(alerts[0]._id).toEqual('f7877a31b1cc83373dbc9ba5939ebfab1db66545');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('f7877a31b1cc83373dbc9ba5939ebfab1db66545');
    expect(alerts[0]._source[ALERT_NEW_TERMS]).toEqual(['127.0.0.1']);
  });

  test('should create an alert with a different _id if the newTerms array is different', () => {
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const completeRule = getCompleteRuleMock(getNewTermsRuleParams());
    const alerts = wrapNewTermsAlerts({
      eventsAndTerms: [{ event: doc, newTerms: ['127.0.0.2'] }],
      spaceId: 'otherSpace',
      mergeStrategy: 'missingFields',
      completeRule,
      indicesToQuery: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    });

    expect(alerts[0]._id).toEqual('75e5a507a4bc48bcd983820c7fd2d9621ff4e2ea');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('75e5a507a4bc48bcd983820c7fd2d9621ff4e2ea');
    expect(alerts[0]._source[ALERT_NEW_TERMS]).toEqual(['127.0.0.2']);
  });

  test('should create an alert with a different _id if the newTerms array contains multiple terms', () => {
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const completeRule = getCompleteRuleMock(getNewTermsRuleParams());
    const alerts = wrapNewTermsAlerts({
      eventsAndTerms: [{ event: doc, newTerms: ['127.0.0.1', '127.0.0.2'] }],
      spaceId: 'otherSpace',
      mergeStrategy: 'missingFields',
      completeRule,
      indicesToQuery: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    });

    expect(alerts[0]._id).toEqual('86a216cfa4884767d9bb26d2b8db911cb4aa85ce');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('86a216cfa4884767d9bb26d2b8db911cb4aa85ce');
    expect(alerts[0]._source[ALERT_NEW_TERMS]).toEqual(['127.0.0.1', '127.0.0.2']);
  });
});
