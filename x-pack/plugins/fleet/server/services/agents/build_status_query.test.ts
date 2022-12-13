/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildStatusRuntimeQuery } from './build_status_query';

describe('buildStatusRuntimeQuery', () => {
  it('should return undefined if no unenrollTimeouts are provided', () => {
    expect(buildStatusRuntimeQuery([])).toBeUndefined();
  });

  it('should return emit statement if no unenroll timeouts are provided', () => {
    expect(
      buildStatusRuntimeQuery([
        {
          policy_ids: [
            '813a40a5-14c1-403f-8f1a-9da5e356628d',
            'd0c050dc-6d3f-487c-92f8-4f7f05f9e0da',
            '6424829a-7463-4b2b-8f5f-36da232f63df',
            '22a886f6-5221-4450-a1a5-885fd188c5ab',
          ],
          unenroll_timeout: 300,
        },
      ])
    ).toBeUndefined();
  });
});
