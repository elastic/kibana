/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '../../../../../src/core/server/elasticsearch/client/mocks';
import { getTotalCountInUse } from './alerts_telemetry';

describe('alerts telemetry', () => {
  test('getTotalCountInUse should replace first "." symbol to "__" in alert types names', async () => {
    const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;
    mockEsClient.search.mockReturnValue(
      // @ts-expect-error @elastic/elasticsearch Aggregate only allows unknown values
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        aggregations: {
          byAlertTypeId: {
            value: {
              types: { '.index-threshold': 2, 'logs.alert.document.count': 1, 'document.test.': 1 },
            },
          },
        },
        hits: {
          hits: [],
        },
      })
    );

    const telemetry = await getTotalCountInUse(mockEsClient, 'test');

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);

    expect(telemetry).toMatchInlineSnapshot(`
Object {
  "countByType": Object {
    "__index-threshold": 2,
    "document.test__": 1,
    "logs.alert.document.count": 1,
  },
  "countTotal": 4,
}
`);
  });
});
