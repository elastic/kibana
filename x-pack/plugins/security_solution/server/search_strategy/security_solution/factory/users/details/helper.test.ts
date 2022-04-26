/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserAggEsItem } from '../../../../../../common/search_strategy/security_solution/users/common';
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
      first_seen: { value_as_string: '123456789' },
      last_seen: { value_as_string: '987654321' },
    };

    expect(formatUserItem(aggregations)).toEqual({
      firstSeen: '123456789',
      lastSeen: '987654321',
      user: { id: [userId] },
    });
  });
});
