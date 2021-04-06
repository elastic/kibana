/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsCause } from './es_error_parser';

describe('ES error parser', () => {
  test('should return all the cause of the error', () => {
    expect(
      getEsCause({
        caused_by: {
          reason: 'reason1',
        },
      })
    ).toStrictEqual(['reason1']);

    expect(
      getEsCause({
        caused_by: {
          reason: 'reason1',
          caused_by: {
            reason: 'reason2',
          },
        },
      })
    ).toStrictEqual(['reason1', 'reason2']);

    expect(
      getEsCause({
        failed_shards: [
          {
            reason: {
              caused_by: {
                reason: 'reason3',
              },
            },
          },
        ],
      })
    ).toStrictEqual(['reason3']);
  });
});
