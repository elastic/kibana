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

    await partiallyUpdateRuleWithEs(esClient, MockRuleId, DefaultAttributes);
    expect(esClient.update).toHaveBeenCalledTimes(1);
    expect(esClient.update).toHaveBeenCalledWith({
      id: `alert:${MockRuleId}`,
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      doc: {
        alert: DefaultAttributes,
      },
    });
  });

  test('should work with extraneous attributes ', async () => {
    const attributes = ExtraneousAttributes as unknown as PartiallyUpdateableRuleAttributes;
    esClient.update.mockResolvedValueOnce(MockEsUpdateResponse(MockRuleId));

    await partiallyUpdateRuleWithEs(esClient, MockRuleId, attributes);
    expect(esClient.update).toHaveBeenCalledWith({
      id: `alert:${MockRuleId}`,
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      doc: {
        alert: ExtraneousAttributes,
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

    await partiallyUpdateRuleWithEs(esClient, MockRuleId, DefaultAttributes, {
      version: 'WzQsMV0=',
    });
    expect(esClient.update).toHaveBeenCalledWith({
      id: `alert:${MockRuleId}`,
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      if_primary_term: 1,
      if_seq_no: 4,
      doc: {
        alert: DefaultAttributes,
      },
    });
  });

  test('should handle the ignore404 option', async () => {
    esClient.update.mockResolvedValueOnce(MockEsUpdateResponse(MockRuleId));

    await partiallyUpdateRuleWithEs(esClient, MockRuleId, DefaultAttributes, { ignore404: true });
    expect(esClient.update).toHaveBeenCalledWith(
      {
        id: `alert:${MockRuleId}`,
        index: ALERTING_CASES_SAVED_OBJECT_INDEX,
        doc: {
          alert: DefaultAttributes,
        },
      },
      { ignore: [404] }
    );
  });

  test('should handle the refresh option', async () => {
    esClient.update.mockResolvedValueOnce(MockEsUpdateResponse(MockRuleId));

    await partiallyUpdateRuleWithEs(esClient, MockRuleId, DefaultAttributes, {
      refresh: 'wait_for',
    });
    expect(esClient.update).toHaveBeenCalledWith({
      id: `alert:${MockRuleId}`,
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      doc: {
        alert: DefaultAttributes,
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
