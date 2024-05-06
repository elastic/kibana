/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { cloneDeep } from 'lodash';

import {
  ALERT_URL,
  ALERT_UUID,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_INSTANCE_ID,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
} from '@kbn/rule-data-utils';
import { ALERT_NEW_TERMS } from '../../../../../common/field_maps/field_names';
import { getCompleteRuleMock, getNewTermsRuleParams } from '../../rule_schema/mocks';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import { sampleDocNoSortIdWithTimestamp } from '../__mocks__/es_results';
import { wrapSuppressedNewTermsAlerts } from './wrap_suppressed_new_terms_alerts';

const ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();

const docId = 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71';
const publicBaseUrl = 'http://somekibanabaseurl.com';

const alertSuppression = {
  groupBy: ['source.ip'],
};

const completeRule = getCompleteRuleMock(getNewTermsRuleParams());
completeRule.ruleParams.alertSuppression = alertSuppression;

describe('wrapSuppressedNewTermsAlerts', () => {
  test('should create an alert with the correct _id from a document and suppression fields', () => {
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const alerts = wrapSuppressedNewTermsAlerts({
      eventsAndTerms: [{ event: doc, newTerms: ['127.0.0.1'] }],
      spaceId: 'default',
      mergeStrategy: 'missingFields',
      completeRule,
      indicesToQuery: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
      alertTimestampOverride: undefined,
      ruleExecutionLogger,
      publicBaseUrl,
      primaryTimestamp: '@timestamp',
    });

    expect(alerts[0]._id).toEqual('3b67aa2ebdc628afc98febc65082d2d83a116d79');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('3b67aa2ebdc628afc98febc65082d2d83a116d79');
    expect(alerts[0]._source[ALERT_NEW_TERMS]).toEqual(['127.0.0.1']);
    expect(alerts[0]._source[ALERT_URL]).toContain(
      'http://somekibanabaseurl.com/app/security/alerts/redirect/3b67aa2ebdc628afc98febc65082d2d83a116d79?index=.alerts-security.alerts-default'
    );
    expect(alerts[0]._source[ALERT_SUPPRESSION_DOCS_COUNT]).toEqual(0);
    expect(alerts[0]._source[ALERT_INSTANCE_ID]).toEqual(
      '1bf77f90e72d76d9335ad0ce356340a3d9833f96'
    );
    expect(alerts[0]._source[ALERT_SUPPRESSION_TERMS]).toEqual([
      { field: 'source.ip', value: ['127.0.0.1'] },
    ]);
    expect(alerts[0]._source[ALERT_SUPPRESSION_START]).toBeDefined();
    expect(alerts[0]._source[ALERT_SUPPRESSION_END]).toBeDefined();
  });

  test('should create an alert with a different _id if suppression field is different', () => {
    const completeRuleCloned = cloneDeep(completeRule);
    completeRuleCloned.ruleParams.alertSuppression = {
      groupBy: ['someKey'],
    };
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const alerts = wrapSuppressedNewTermsAlerts({
      eventsAndTerms: [{ event: doc, newTerms: ['127.0.0.1'] }],
      spaceId: 'default',
      mergeStrategy: 'missingFields',
      completeRule: completeRuleCloned,
      indicesToQuery: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
      alertTimestampOverride: undefined,
      ruleExecutionLogger,
      publicBaseUrl,
      primaryTimestamp: '@timestamp',
    });

    expect(alerts[0]._id).toEqual('3e0436a03b735af12d6e5358cb36d2c3b39425a8');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('3e0436a03b735af12d6e5358cb36d2c3b39425a8');
    expect(alerts[0]._source[ALERT_URL]).toContain(
      'http://somekibanabaseurl.com/app/security/alerts/redirect/3e0436a03b735af12d6e5358cb36d2c3b39425a8?index=.alerts-security.alerts-default'
    );
    expect(alerts[0]._source[ALERT_SUPPRESSION_DOCS_COUNT]).toEqual(0);
    expect(alerts[0]._source[ALERT_INSTANCE_ID]).toEqual(
      '01e43acf431fd232bbe230ac523a5d5d1e8a2787'
    );
    expect(alerts[0]._source[ALERT_SUPPRESSION_TERMS]).toEqual([
      { field: 'someKey', value: ['someValue'] },
    ]);
  });

  test('should create an alert with a different _id if the space is different', () => {
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const alerts = wrapSuppressedNewTermsAlerts({
      eventsAndTerms: [{ event: doc, newTerms: ['127.0.0.1'] }],
      spaceId: 'otherSpace',
      mergeStrategy: 'missingFields',
      completeRule,
      indicesToQuery: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
      alertTimestampOverride: undefined,
      ruleExecutionLogger,
      publicBaseUrl,
      primaryTimestamp: '@timestamp',
    });

    expect(alerts[0]._id).toEqual('f8a029df9c99e245dc83977153a0612178f3d2e8');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('f8a029df9c99e245dc83977153a0612178f3d2e8');
    expect(alerts[0]._source[ALERT_URL]).toContain(
      'http://somekibanabaseurl.com/s/otherSpace/app/security/alerts/redirect/f8a029df9c99e245dc83977153a0612178f3d2e8?index=.alerts-security.alerts-otherSpace'
    );
  });

  test('should create an alert with a different _id if the newTerms array is different', () => {
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const alerts = wrapSuppressedNewTermsAlerts({
      eventsAndTerms: [{ event: doc, newTerms: ['127.0.0.2'] }],
      spaceId: 'otherSpace',
      mergeStrategy: 'missingFields',
      completeRule,
      indicesToQuery: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
      alertTimestampOverride: undefined,
      ruleExecutionLogger,
      publicBaseUrl,
      primaryTimestamp: '@timestamp',
    });

    expect(alerts[0]._id).toEqual('cb8684ec72592346d32839b1838e4f4080dc052e');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('cb8684ec72592346d32839b1838e4f4080dc052e');
    expect(alerts[0]._source[ALERT_NEW_TERMS]).toEqual(['127.0.0.2']);
    expect(alerts[0]._source[ALERT_URL]).toContain(
      'http://somekibanabaseurl.com/s/otherSpace/app/security/alerts/redirect/cb8684ec72592346d32839b1838e4f4080dc052e?index=.alerts-security.alerts-otherSpace'
    );
  });
});
