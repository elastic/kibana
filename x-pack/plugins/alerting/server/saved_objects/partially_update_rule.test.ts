/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  ISavedObjectsRepository,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import {
  PartiallyUpdateableRuleAttributes,
  partiallyUpdateRule,
  partiallyUpdateRuleWithEs,
} from './partially_update_rule';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { RULE_SAVED_OBJECT_TYPE } from '.';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { estypes } from '@elastic/elasticsearch';
import { RuleExecutionStatuses } from '@kbn/alerting-types';

const MockSavedObjectsClientContract = savedObjectsClientMock.create();
const MockISavedObjectsRepository =
  MockSavedObjectsClientContract as unknown as jest.Mocked<ISavedObjectsRepository>;
const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

describe('partiallyUpdateRule', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  for (const [soClientName, soClient] of Object.entries(getMockSavedObjectClients()))
    describe(`using ${soClientName}`, () => {
      test('should work with no options', async () => {
        soClient.update.mockResolvedValueOnce(MockUpdateValue);

        await partiallyUpdateRule(soClient, MockRuleId, DefaultAttributes);
        expect(soClient.update).toHaveBeenCalledWith(
          RULE_SAVED_OBJECT_TYPE,
          MockRuleId,
          DefaultAttributes,
          {}
        );
      });

      test('should work with extraneous attributes ', async () => {
        const attributes = ExtraneousAttributes as unknown as PartiallyUpdateableRuleAttributes;
        soClient.update.mockResolvedValueOnce(MockUpdateValue);

        await partiallyUpdateRule(soClient, MockRuleId, attributes);
        expect(soClient.update).toHaveBeenCalledWith(
          RULE_SAVED_OBJECT_TYPE,
          MockRuleId,
          ExtraneousAttributes,
          {}
        );
      });

      test('should handle SO errors', async () => {
        soClient.update.mockRejectedValueOnce(new Error('wops'));

        await expect(
          partiallyUpdateRule(soClient, MockRuleId, DefaultAttributes)
        ).rejects.toThrowError('wops');
      });

      test('should handle the version option', async () => {
        soClient.update.mockResolvedValueOnce(MockUpdateValue);

        await partiallyUpdateRule(soClient, MockRuleId, DefaultAttributes, { version: '1.2.3' });
        expect(soClient.update).toHaveBeenCalledWith(
          RULE_SAVED_OBJECT_TYPE,
          MockRuleId,
          DefaultAttributes,
          {
            version: '1.2.3',
          }
        );
      });

      test('should handle the ignore404 option', async () => {
        const err = SavedObjectsErrorHelpers.createGenericNotFoundError();
        soClient.update.mockRejectedValueOnce(err);

        await partiallyUpdateRule(soClient, MockRuleId, DefaultAttributes, { ignore404: true });
        expect(soClient.update).toHaveBeenCalledWith(
          RULE_SAVED_OBJECT_TYPE,
          MockRuleId,
          DefaultAttributes,
          {}
        );
      });

      test('should handle the namespace option', async () => {
        soClient.update.mockResolvedValueOnce(MockUpdateValue);

        await partiallyUpdateRule(soClient, MockRuleId, DefaultAttributes, {
          namespace: 'bat.cave',
        });
        expect(soClient.update).toHaveBeenCalledWith(
          RULE_SAVED_OBJECT_TYPE,
          MockRuleId,
          DefaultAttributes,
          {
            namespace: 'bat.cave',
          }
        );
      });
    });
});

describe('partiallyUpdateRuleWithEs', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  test('should work with no options', async () => {
    esClient.update.mockResolvedValueOnce(MockEsUpdateResponse(MockRuleId));

    await partiallyUpdateRuleWithEs(esClient, MockRuleId, DefaultAttributesForEsUpdate);
    expect(esClient.update).toHaveBeenCalledTimes(1);
    expect(esClient.update).toHaveBeenCalledWith({
      id: `alert:${MockRuleId}`,
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      doc: {
        alert: DefaultAttributesForEsUpdate,
      },
    });
  });

  test('should strip unallowed attributes ', async () => {
    const attributes =
      AttributesForEsUpdateWithUnallowedFields as unknown as PartiallyUpdateableRuleAttributes;
    esClient.update.mockResolvedValueOnce(MockEsUpdateResponse(MockRuleId));

    await partiallyUpdateRuleWithEs(esClient, MockRuleId, attributes);
    expect(esClient.update).toHaveBeenCalledWith({
      id: `alert:${MockRuleId}`,
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      doc: {
        alert: DefaultAttributesForEsUpdate,
      },
    });
  });

  test('should handle ES errors', async () => {
    esClient.update.mockRejectedValueOnce(new Error('wops'));

    await expect(
      partiallyUpdateRuleWithEs(esClient, MockRuleId, DefaultAttributes)
    ).rejects.toThrowError('wops');
  });

  test('should handle the version option', async () => {
    esClient.update.mockResolvedValueOnce(MockEsUpdateResponse(MockRuleId));

    await partiallyUpdateRuleWithEs(esClient, MockRuleId, DefaultAttributesForEsUpdate, {
      version: 'WzQsMV0=',
    });
    expect(esClient.update).toHaveBeenCalledWith({
      id: `alert:${MockRuleId}`,
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      if_primary_term: 1,
      if_seq_no: 4,
      doc: {
        alert: DefaultAttributesForEsUpdate,
      },
    });
  });

  test('should handle the ignore404 option', async () => {
    esClient.update.mockResolvedValueOnce(MockEsUpdateResponse(MockRuleId));

    await partiallyUpdateRuleWithEs(esClient, MockRuleId, DefaultAttributesForEsUpdate, {
      ignore404: true,
    });
    expect(esClient.update).toHaveBeenCalledWith(
      {
        id: `alert:${MockRuleId}`,
        index: ALERTING_CASES_SAVED_OBJECT_INDEX,
        doc: {
          alert: DefaultAttributesForEsUpdate,
        },
      },
      { ignore: [404] }
    );
  });

  test('should handle the refresh option', async () => {
    esClient.update.mockResolvedValueOnce(MockEsUpdateResponse(MockRuleId));

    await partiallyUpdateRuleWithEs(esClient, MockRuleId, DefaultAttributesForEsUpdate, {
      refresh: 'wait_for',
    });
    expect(esClient.update).toHaveBeenCalledWith({
      id: `alert:${MockRuleId}`,
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      doc: {
        alert: DefaultAttributesForEsUpdate,
      },
      refresh: 'wait_for',
    });
  });
});

function getMockSavedObjectClients(): Record<
  string,
  jest.Mocked<SavedObjectsClientContract | ISavedObjectsRepository>
> {
  return {
    SavedObjectsClientContract: MockSavedObjectsClientContract,
    // doesn't appear to be a mock for this, but it's basically the same as the above,
    // so just cast it to make sure we catch any type errors
    ISavedObjectsRepository: MockISavedObjectsRepository,
  };
}

const DefaultAttributes = {
  scheduledTaskId: 'scheduled-task-id',
  muteAll: true,
  mutedInstanceIds: ['muted-instance-id-1', 'muted-instance-id-2'],
  updatedBy: 'someone',
  updatedAt: '2019-02-12T21:01:22.479Z',
};

const ExtraneousAttributes = { ...DefaultAttributes, foo: 'bar' };

const DefaultAttributesForEsUpdate = {
  running: false,
  executionStatus: {
    status: 'active' as RuleExecutionStatuses,
    lastExecutionDate: '2023-01-01T08:44:40.000Z',
    lastDuration: 12,
    error: null,
    warning: null,
  },
  monitoring: {
    run: {
      calculated_metrics: {
        success_ratio: 20,
      },
      history: [
        {
          success: true,
          timestamp: 1640991880000,
          duration: 12,
          outcome: 'success',
        },
      ],
      last_run: {
        timestamp: '2023-01-01T08:44:40.000Z',
        metrics: {
          duration: 12,
          gap_duration_s: null,
          total_alerts_created: null,
          total_alerts_detected: null,
          total_indexing_duration_ms: null,
          total_search_duration_ms: null,
        },
      },
    },
  },
};

const AttributesForEsUpdateWithUnallowedFields = {
  ...DefaultAttributesForEsUpdate,
  alertTypeId: 'foo',
  consumer: 'consumer',
  randomField: 'bar',
};

const MockRuleId = 'rule-id';

const MockUpdateValue = {
  id: MockRuleId,
  type: RULE_SAVED_OBJECT_TYPE,
  attributes: {
    actions: [],
    scheduledTaskId: 'scheduled-task-id',
  },
  references: [],
};

const MockEsUpdateResponse = (id: string) => ({
  _index: '.kibana_alerting_cases_9.0.0_001',
  _id: `alert:${id}`,
  _version: 3,
  result: 'updated' as estypes.Result,
  _shards: { total: 1, successful: 1, failed: 0 },
  _seq_no: 5,
  _primary_term: 1,
});
