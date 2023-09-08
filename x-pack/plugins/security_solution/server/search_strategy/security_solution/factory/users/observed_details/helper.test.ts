/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserAggEsItem } from '../../../../../../common/search_strategy/security_solution/users/common';
import { fieldNameToAggField, formatUserItem } from './helpers';

describe('helpers', () => {
  it('it convert field name to aggregation field name', () => {
    expect(fieldNameToAggField('host.os.family')).toBe('host_os_family');
  });

  it('it formats UserItem', () => {
    const userId = '123';
    const aggregations: UserAggEsItem = {
      user_id: {
        buckets: [
          {
            key: userId,
            doc_count: 1,
          },
        ],
      },
    };

    expect(formatUserItem(aggregations)).toEqual({
      user: { id: [userId] },
    });
  });
});
