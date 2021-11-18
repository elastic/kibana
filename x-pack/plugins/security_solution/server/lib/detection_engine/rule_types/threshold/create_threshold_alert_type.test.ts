/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { allowedExperimentalValues } from '../../../../../common/experimental_features';
import { createThresholdAlertType } from './create_threshold_alert_type';
import { createRuleTypeMocks } from '../__mocks__/rule_type';
import { getThresholdRuleParams } from '../../schemas/rule_schemas.mock';
import { createSecurityRuleTypeWrapper } from '../create_security_rule_type_wrapper';
import { createMockConfig } from '../../routes/__mocks__';

jest.mock('../../rule_execution_log/rule_execution_log_client');

describe('Threshold Alerts', () => {
  it('does not send an alert when no events found', async () => {
    const params = getThresholdRuleParams();
    const { dependencies, executor } = createRuleTypeMocks('threshold', params);
    const securityRuleTypeWrapper = createSecurityRuleTypeWrapper({
      lists: dependencies.lists,
      logger: dependencies.logger,
      config: createMockConfig(),
      ruleDataClient: dependencies.ruleDataClient,
      eventLogService: dependencies.eventLogService,
    });
    const thresholdAlertType = securityRuleTypeWrapper(
      createThresholdAlertType({
        experimentalFeatures: allowedExperimentalValues,
        logger: dependencies.logger,
        version: '1.0.0',
      })
    );
    dependencies.alerting.registerType(thresholdAlertType);

    await executor({ params });
    expect(dependencies.ruleDataClient.getWriter).not.toBeCalled();
  });
});
