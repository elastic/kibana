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
    rulesOptionsMock.ruleUpdate.enabled = false;
    ((rulesOptionsMock.alertsClient as unknown) as AlertsClientMock).get.mockResolvedValue(
      getResult()
    );

    await updateRules(rulesOptionsMock);

    expect(rulesOptionsMock.alertsClient.disable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: rulesOptionsMock.ruleUpdate.id,
      })
    );
  });

  it('should call alertsClient.enable if the rule was disabled and enabled is true', async () => {
    const rulesOptionsMock = getUpdateRulesOptionsMock();
    rulesOptionsMock.ruleUpdate.enabled = true;

    ((rulesOptionsMock.alertsClient as unknown) as AlertsClientMock).get.mockResolvedValue({
      ...getResult(),
      enabled: false,
    });

    await updateRules(rulesOptionsMock);

    expect(rulesOptionsMock.alertsClient.enable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: rulesOptionsMock.ruleUpdate.id,
      })
    );
  });

  it('calls the alertsClient with params', async () => {
    const rulesOptionsMock = getUpdateMlRulesOptionsMock();
    rulesOptionsMock.ruleUpdate.enabled = true;

    ((rulesOptionsMock.alertsClient as unknown) as AlertsClientMock).get.mockResolvedValue(
      getMlResult()
    );

    await updateRules(rulesOptionsMock);

    expect(rulesOptionsMock.alertsClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            type: 'machine_learning',
            severity: 'high',
          }),
        }),
      })
    );
  });
});
