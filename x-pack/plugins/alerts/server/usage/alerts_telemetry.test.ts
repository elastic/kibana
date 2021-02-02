/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTotalCountInUse } from './alerts_telemetry';

describe('alerts telemetry', () => {
  test('getTotalCountInUse should replace first "." symbol to "__" in alert types names', async () => {
    const mockEsClient = jest.fn();
    mockEsClient.mockReturnValue({
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
    });

    const telemetry = await getTotalCountInUse(mockEsClient, 'test');

    expect(mockEsClient).toHaveBeenCalledTimes(1);

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
