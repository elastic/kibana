/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTotalCountInUse } from './alerts_telemetry';

describe('alerts telemetry', () => {
  test('getTotalCountInUse should replace action types names with . to __', async () => {
    const mockEsClient = jest.fn();
    mockEsClient.mockReturnValue({
      aggregations: {
        byAlertTypeId: {
          value: {
            types: { '.index-threshold': 2 },
          },
        },
      },
      hits: {
        hits: [],
      },
    });

    const telemetry = await getTotalCountInUse(mockEsClient, 'test');

    expect(mockEsClient).toHaveBeenCalledTimes(1);

    expect(telemetry).toMatchInlineSnapshot(`
Object {
  "countByType": Object {
    "__index-threshold": 2,
  },
  "countTotal": 2,
}
`);
  });
});
