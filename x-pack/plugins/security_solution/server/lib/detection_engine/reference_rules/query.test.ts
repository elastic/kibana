/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

// import { sequenceResponse } from '../../../search_strategy/timeline/eql/__mocks__';

import { queryAlertType } from './query';
import { createRuleTypeMocks } from './__mocks__/rule_type';

describe('Custom query alerts', () => {
  it('does not send an alert when no events found', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    dependencies.registry.registerType(queryAlertType);

    const params = {
      customQuery: 'dne:42',
      indexPatterns: ['*'],
    };

    services.scopedClusterClient.asCurrentUser.transport.request.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        hits: {
          hits: [],
          sequences: [],
          events: [],
          total: {
            relation: 'eq',
            value: 0,
          },
        },
        took: 0,
        timed_out: false,
        _shards: {
          failed: 0,
          skipped: 0,
          successful: 1,
          total: 1,
        },
      })
    );

    await executor({ params });
    expect(services.alertInstanceFactory).not.toBeCalled();
  });

  it('sends a properly formatted alert when events are found', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    dependencies.registry.registerType(queryAlertType);

    const params = {
      eqlQuery: '*:*',
      indexPatterns: ['*'],
    };

    services.scopedClusterClient.asCurrentUser.transport.request.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        hits: {
          hits: ['TODO'],
          total: {
            relation: 'eq',
            value: 0, // TODO
          },
        },
        took: 0,
        timed_out: false,
        _shards: {
          failed: 0,
          skipped: 0,
          successful: 1,
          total: 1,
        },
      })
    );

    await executor({ params });
    expect(services.alertInstanceFactory).toBeCalled();
    expect(services.scopedRuleRegistryClient.bulkIndex).toBeCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          'event.kind': 'signal',
        }),
      ])
    );
  });
});
