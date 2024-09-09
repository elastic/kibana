/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { cloneDeep } from 'lodash';
import moment from 'moment';

import {
  ALERT_URL,
  ALERT_UUID,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_INSTANCE_ID,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
} from '@kbn/rule-data-utils';
import { getCompleteRuleMock, getEsqlRuleParams } from '../../rule_schema/mocks';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import { sampleDocNoSortIdWithTimestamp } from '../__mocks__/es_results';
import { wrapSuppressedEsqlAlerts } from './wrap_suppressed_esql_alerts';

import * as esqlUtils from './utils/generate_alert_id';

const ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();

const docId = 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71';
const publicBaseUrl = 'http://somekibanabaseurl.com';

const alertSuppression = {
  groupBy: ['source.ip'],
};

const completeRule = getCompleteRuleMock(getEsqlRuleParams());
completeRule.ruleParams.alertSuppression = alertSuppression;

describe('wrapSuppressedEsqlAlerts', () => {
  test('should create an alert with the correct _id from a document and suppression fields', () => {
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const alerts = wrapSuppressedEsqlAlerts({
      events: [doc],
      isRuleAggregating: false,
      spaceId: 'default',
      mergeStrategy: 'missingFields',
      completeRule,
      alertTimestampOverride: undefined,
      ruleExecutionLogger,
      publicBaseUrl,
      primaryTimestamp: '@timestamp',
      tuple: {
        to: moment('2010-10-20 04:43:12'),
        from: moment('2010-10-20 04:43:12'),
        maxSignals: 100,
      },
    });

    expect(alerts[0]._id).toEqual('ed7fbf575371c898e0f0aea48cdf0bf1865939a9');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('ed7fbf575371c898e0f0aea48cdf0bf1865939a9');
    expect(alerts[0]._source[ALERT_URL]).toContain(
      'http://somekibanabaseurl.com/app/security/alerts/redirect/ed7fbf575371c898e0f0aea48cdf0bf1865939a9?index=.alerts-security.alerts-default'
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
    const alerts = wrapSuppressedEsqlAlerts({
      events: [doc],
      spaceId: 'default',
      isRuleAggregating: true,
      mergeStrategy: 'missingFields',
      completeRule: completeRuleCloned,
      alertTimestampOverride: undefined,
      ruleExecutionLogger,
      publicBaseUrl,
      primaryTimestamp: '@timestamp',
      tuple: {
        to: moment('2010-10-20 04:43:12'),
        from: moment('2010-10-20 04:43:12'),
        maxSignals: 100,
      },
    });

    expect(alerts[0]._source[ALERT_URL]).toContain(
      'http://somekibanabaseurl.com/app/security/alerts/redirect/'
    );
    expect(alerts[0]._source[ALERT_SUPPRESSION_DOCS_COUNT]).toEqual(0);
    expect(alerts[0]._source[ALERT_INSTANCE_ID]).toEqual(
      'c88edd552cb3501f040aea63ec68312e71af2ed2'
    );
    expect(alerts[0]._source[ALERT_SUPPRESSION_TERMS]).toEqual([
      { field: 'someKey', value: 'someValue' },
    ]);
  });

  test('should call generateAlertId for alert id', () => {
    jest.spyOn(esqlUtils, 'generateAlertId').mockReturnValueOnce('mocked-alert-id');
    const completeRuleCloned = cloneDeep(completeRule);
    completeRuleCloned.ruleParams.alertSuppression = {
      groupBy: ['someKey'],
    };
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const alerts = wrapSuppressedEsqlAlerts({
      events: [doc],
      spaceId: 'default',
      isRuleAggregating: false,
      mergeStrategy: 'missingFields',
      completeRule: completeRuleCloned,
      alertTimestampOverride: undefined,
      ruleExecutionLogger,
      publicBaseUrl,
      primaryTimestamp: '@timestamp',
      tuple: {
        to: moment('2010-10-20 04:43:12'),
        from: moment('2010-10-20 04:43:12'),
        maxSignals: 100,
      },
    });

    expect(alerts[0]._id).toEqual('mocked-alert-id');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('mocked-alert-id');

    expect(esqlUtils.generateAlertId).toHaveBeenCalledWith(
      expect.objectContaining({
        completeRule: expect.any(Object),
        event: expect.any(Object),
        index: 0,
        isRuleAggregating: false,
        spaceId: 'default',
        tuple: {
          from: expect.any(Object),
          maxSignals: 100,
          to: expect.any(Object),
        },
      })
    );
  });
});
