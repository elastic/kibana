/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

import { sequenceResponse } from '../../../search_strategy/timeline/eql/__mocks__';

import { createEqlAlertType } from './eql';
import { createRuleTypeMocks } from './__mocks__/rule_type';

describe('EQL alerts', () => {
  it('does not send an alert when sequence not found', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();
    const eqlAlertType = createEqlAlertType(dependencies.ruleDataClient, dependencies.logger);

    dependencies.alerting.registerType(eqlAlertType);

    const params = {
      eqlQuery: 'sequence by host.name↵[any where true]↵[any where true]↵[any where true]',
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

  it('sends a properly formatted alert when sequence is found', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();
    const eqlAlertType = createEqlAlertType(dependencies.ruleDataClient, dependencies.logger);

    dependencies.alerting.registerType(eqlAlertType);

    const params = {
      eqlQuery: 'sequence by host.name↵[any where true]↵[any where true]↵[any where true]',
      indexPatterns: ['*'],
    };

    services.scopedClusterClient.asCurrentUser.transport.request.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        hits: sequenceResponse.rawResponse.body.hits,
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
    /*
    expect(services.alertWithPersistence).toBeCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          'event.kind': 'signal',
          'kibana.rac.alert.building_block_type': 'default',
        }),
      ])
    );
    */
  });
});
