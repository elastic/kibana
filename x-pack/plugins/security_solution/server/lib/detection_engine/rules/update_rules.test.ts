/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getResult, getMlResult } from '../routes/__mocks__/request_responses';
import { updateRules } from './update_rules';
import { getUpdateRulesOptionsMock, getUpdateMlRulesOptionsMock } from './update_rules.mock';
import { AlertsClientMock } from '../../../../../alerts/server/alerts_client.mock';

describe('updateRules', () => {
  it('should call alertsClient.disable if the rule was enabled and enabled is false', async () => {
    const rulesOptionsMock = getUpdateRulesOptionsMock();
    const ruleOptions = {
      ...rulesOptionsMock,
      enabled: false,
    };
    ((ruleOptions.alertsClient as unknown) as AlertsClientMock).get.mockResolvedValue(getResult());

    await updateRules(ruleOptions);

    expect(ruleOptions.alertsClient.disable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: rulesOptionsMock.id,
      })
    );
  });

  it('should call alertsClient.enable if the rule was disabled and enabled is true', async () => {
    const rulesOptionsMock = getUpdateRulesOptionsMock();
    const ruleOptions = {
      ...rulesOptionsMock,
      enabled: true,
    };

    ((ruleOptions.alertsClient as unknown) as AlertsClientMock).get.mockResolvedValue({
      ...getResult(),
      enabled: false,
    });

    await updateRules(ruleOptions);

    expect(ruleOptions.alertsClient.enable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: rulesOptionsMock.id,
      })
    );
  });

  it('calls the alertsClient with ML params', async () => {
    const rulesOptionsMock = getUpdateMlRulesOptionsMock();
    const ruleOptions = {
      ...rulesOptionsMock,
      enabled: true,
    };

    ((ruleOptions.alertsClient as unknown) as AlertsClientMock).get.mockResolvedValue(
      getMlResult()
    );

    await updateRules(ruleOptions);

    expect(ruleOptions.alertsClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            anomalyThreshold: rulesOptionsMock.anomalyThreshold,
            machineLearningJobId: rulesOptionsMock.machineLearningJobId,
          }),
        }),
      })
    );
  });
});
