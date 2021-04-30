/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eqlAlertType } from './eql';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';
import { createRuleTypeMocks } from './__mocks__/rule_type';

describe('Error count alert', () => {
  it("doesn't send an alert when sequence not found", async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();

    dependencies.registry.registerType(eqlAlertType);

    const params = {
        eqlQuery: 'sequence by host.name [network where true=true]',
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
});
