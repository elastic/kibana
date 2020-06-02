/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from '../../../../../../../src/core/server/mocks';
import { alertsClientMock } from '../../../../../alerts/server/mocks';
import { getResult, getMlResult } from '../routes/__mocks__/request_responses';
import { patchRules } from './patch_rules';

describe('patchRules', () => {
  let alertsClient: ReturnType<typeof alertsClientMock.create>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    alertsClient = alertsClientMock.create();
    savedObjectsClient = savedObjectsClientMock.create();
  });

  it('should call alertsClient.disable is the rule was enabled and enabled is false', async () => {
    const existingRule = getResult();
    const params = getResult().params;

    await patchRules({
      alertsClient,
      savedObjectsClient,
      rule: existingRule,
      ...params,
      enabled: false,
      interval: '',
      name: '',
      tags: [],
    });

    expect(alertsClient.disable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existingRule.id,
      })
    );
  });

  it('should call alertsClient.enable is the rule was disabled and enabled is true', async () => {
    const existingRule = {
      ...getResult(),
      enabled: false,
    };
    const params = getResult().params;

    await patchRules({
      alertsClient,
      savedObjectsClient,
      rule: existingRule,
      ...params,
      enabled: true,
      interval: '',
      name: '',
      tags: [],
    });

    expect(alertsClient.enable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existingRule.id,
      })
    );
  });

  it('calls the alertsClient with ML params', async () => {
    const existingRule = getMlResult();
    const params = {
      ...getMlResult().params,
      anomalyThreshold: 55,
      machineLearningJobId: 'new_job_id',
    };

    await patchRules({
      alertsClient,
      savedObjectsClient,
      rule: existingRule,
      ...params,
    });

    expect(alertsClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            anomalyThreshold: 55,
            machineLearningJobId: 'new_job_id',
          }),
        }),
      })
    );
  });
});
