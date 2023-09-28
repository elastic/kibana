/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformPrivilegesToElasticsearchPrivileges } from './role_utils';
import { ALL_SPACES_ID } from '../../common/constants';

describe('transformPrivilegesToElasticsearchPrivileges', () => {
  test('returns expected result', () => {
    expect(
      transformPrivilegesToElasticsearchPrivileges('kibana,-kibana', [
        {
          spaces: [ALL_SPACES_ID],
          feature: {
            uptime: ['all'],
          },
        },
      ])
    ).toEqual([
      { application: 'kibana,-kibana', privileges: ['feature_uptime.all'], resources: ['*'] },
    ]);
  });
});
