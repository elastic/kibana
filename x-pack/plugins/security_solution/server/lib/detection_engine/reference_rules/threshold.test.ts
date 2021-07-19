/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

import { createRuleTypeMocks } from './__mocks__/rule_type';
import { mockThresholdResults } from './__mocks__/threshold';
import { createThresholdAlertType } from './threshold';

describe('Threshold alerts', () => {
  it('does not send an alert when threshold is not met', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();
    const thresholdAlertType = createThresholdAlertType(
      dependencies.ruleDataClient,
      dependencies.logger
    );

    dependencies.alerting.registerType(thresholdAlertType);

    const params = {
      indexPatterns: ['*'],
      customQuery: '*:*',
      thresholdFields: ['source.ip', 'host.name'],
      thresholdValue: 4,
    };

    services.scopedClusterClient.asCurrentUser.search.mockReturnValue(
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
        aggregations: {
          'threshold_0:source.ip': {
            buckets: [],
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

  it('sends a properly formatted alert when threshold is met', async () => {
    const { services, dependencies, executor } = createRuleTypeMocks();
    const thresholdAlertType = createThresholdAlertType(
      dependencies.ruleDataClient,
      dependencies.logger
    );

    dependencies.alerting.registerType(thresholdAlertType);

    const params = {
      indexPatterns: ['*'],
      customQuery: '*:*',
      thresholdFields: ['source.ip', 'host.name'],
      thresholdValue: 4,
    };

    services.scopedClusterClient.asCurrentUser.search
      .mockReturnValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          hits: {
            hits: [],
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
      )
      .mockReturnValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          hits: {
            hits: [],
            total: {
              relation: 'eq',
              value: 0,
            },
          },
          aggregations: mockThresholdResults.rawResponse.body.aggregations,
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
        }),
      ])
    );
    */
  });
});
