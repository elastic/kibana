/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Role } from '../../../../../common/model/role';
import { copyRole } from './copy_role';

describe('copyRole', () => {
  it('should perform a deep copy', () => {
    const role: Role = {
      name: '',
      elasticsearch: {
        cluster: ['all'],
        indices: [{ names: ['index*'], privileges: ['all'] }],
        run_as: ['user'],
      },
      kibana: {
        global: ['read'],
        space: {
          marketing: ['all'],
        },
      },
    };

    const result = copyRole(role);
    expect(result).toEqual(role);

    role.elasticsearch.indices[0].names = ['something else'];

    expect(result).not.toEqual(role);
  });
});
