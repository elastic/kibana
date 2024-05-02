/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { cloneDeep } from 'lodash';
import moment from 'moment';

import { ALERT_UUID } from '@kbn/rule-data-utils';
import { getCompleteRuleMock, getEsqlRuleParams } from '../../rule_schema/mocks';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import { sampleDocNoSortIdWithTimestamp } from '../__mocks__/es_results';
import { wrapEsqlAlerts } from './wrap_esql_alerts';

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
  test('should create an alert with the correct _id from a document', () => {
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const alerts = wrapEsqlAlerts({
      events: [doc],
      isRuleAggregating: false,
      spaceId: 'default',
      mergeStrategy: 'missingFields',
      completeRule,
      alertTimestampOverride: undefined,
      ruleExecutionLogger,
      publicBaseUrl,
      tuple: {
        to: moment('2010-10-20 04:43:12'),
        from: moment('2010-10-20 04:43:12'),
        maxSignals: 100,
      },
    });

    expect(alerts[0]._id).toEqual('ed7fbf575371c898e0f0aea48cdf0bf1865939a9');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('ed7fbf575371c898e0f0aea48cdf0bf1865939a9');
  });

  test('should call generateAlertId for alert id', () => {
    jest.spyOn(esqlUtils, 'generateAlertId').mockReturnValueOnce('mocked-alert-id');
    const completeRuleCloned = cloneDeep(completeRule);
    completeRuleCloned.ruleParams.alertSuppression = {
      groupBy: ['someKey'],
    };
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const alerts = wrapEsqlAlerts({
      events: [doc],
      spaceId: 'default',
      isRuleAggregating: true,
      mergeStrategy: 'missingFields',
      completeRule: completeRuleCloned,
      alertTimestampOverride: undefined,
      ruleExecutionLogger,
      publicBaseUrl,
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
        isRuleAggregating: true,
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
