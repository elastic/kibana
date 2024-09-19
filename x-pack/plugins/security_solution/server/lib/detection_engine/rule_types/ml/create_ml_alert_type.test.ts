/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mlPluginServerMock } from '../../../../../../ml/server/mocks';

import { allowedExperimentalValues } from '../../../../../common/experimental_features';
import { bulkCreateMlSignals } from '../../signals/bulk_create_ml_signals';

import { createRuleTypeMocks } from '../__mocks__/rule_type';
import { createMlAlertType } from './create_ml_alert_type';

import { RuleParams } from '../../schemas/rule_schemas';

jest.mock('../../signals/bulk_create_ml_signals');

jest.mock('../utils/get_list_client', () => ({
  getListClient: jest.fn().mockReturnValue({
    listClient: {
      getListItemIndex: jest.fn(),
    },
    exceptionsClient: jest.fn(),
  }),
}));

jest.mock('../../rule_execution_log/rule_execution_log_client');

jest.mock('../../signals/filters/filter_events_against_list', () => ({
  filterEventsAgainstList: jest.fn().mockReturnValue({
    _shards: {
      failures: [],
    },
    hits: {
      hits: [
        {
          is_interim: false,
        },
      ],
    },
  }),
}));

let jobsSummaryMock: jest.Mock;
let mlMock: ReturnType<typeof mlPluginServerMock.createSetupContract>;

describe('Machine Learning Alerts', () => {
  beforeEach(() => {
    jobsSummaryMock = jest.fn();
    jobsSummaryMock.mockResolvedValue([
      {
        id: 'test-ml-job',
        jobState: 'started',
        datafeedState: 'started',
      },
    ]);
    mlMock = mlPluginServerMock.createSetupContract();
    mlMock.jobServiceProvider.mockReturnValue({
      jobsSummary: jobsSummaryMock,
    });

    (bulkCreateMlSignals as jest.Mock).mockResolvedValue({
      success: true,
      bulkCreateDuration: 0,
      createdItemsCount: 1,
      createdItems: [
        {
          _id: '897234565234',
          _index: 'test-index',
          anomalyScore: 23,
        },
      ],
      errors: [],
    });
  });

  const params: Partial<RuleParams> = {
    anomalyThreshold: 23,
    from: 'now-45m',
    machineLearningJobId: ['test-ml-job'],
    to: 'now',
    type: 'machine_learning',
  };

  it('does not send an alert when no anomalies found', async () => {
    jobsSummaryMock.mockResolvedValue([
      {
        id: 'test-ml-job',
        jobState: 'started',
        datafeedState: 'started',
      },
    ]);
    const { dependencies, executor } = createRuleTypeMocks('machine_learning', params);
    const mlAlertType = createMlAlertType({
      experimentalFeatures: allowedExperimentalValues,
      lists: dependencies.lists,
      logger: dependencies.logger,
      mergeStrategy: 'allFields',
      ignoreFields: [],
      ml: mlMock,
      ruleDataClient: dependencies.ruleDataClient,
      ruleDataService: dependencies.ruleDataService,
      version: '1.0.0',
    });

    dependencies.alerting.registerType(mlAlertType);

    await executor({ params });
    expect(dependencies.ruleDataClient.getWriter).not.toBeCalled();
  });
});
