/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ASSET_CRITICALITY_INDEX_PATTERN } from '../../../../common/entity_analytics/asset_criticality/constants';
import { _formatPrivileges, hasReadWritePermissions } from './check_and_format_privileges';

describe('_formatPrivileges', () => {
  it('should correctly format elasticsearch index privileges', () => {
    const privileges = {
      elasticsearch: {
        cluster: [],
        index: {
          index1: [
            {
              privilege: 'read',
              authorized: true,
            },
            {
              privilege: 'write',
              authorized: true,
            },
          ],
          index2: [
            {
              privilege: 'read',
              authorized: true,
            },
            {
              privilege: 'write',
              authorized: true,
            },
          ],
        },
      },
      kibana: [],
    };

    const result = _formatPrivileges(privileges);

    expect(result).toEqual({
      elasticsearch: {
        index: {
          index1: {
            read: true,
            write: true,
          },
          index2: {
            read: true,
            write: true,
          },
        },
      },
      kibana: {},
    });
  });

  it('should correctly format elasticsearch cluster privileges', () => {
    const privileges = {
      elasticsearch: {
        cluster: [
          {
            privilege: 'manage',
            authorized: true,
          },
          {
            privilege: 'monitor',
            authorized: true,
          },
        ],
        index: {},
      },
      kibana: [],
    };

    const result = _formatPrivileges(privileges);

    expect(result).toEqual({
      elasticsearch: {
        cluster: {
          manage: true,
          monitor: true,
        },
      },
      kibana: {},
    });
  });

  it('should correctly format elasticsearch cluster and index privileges', () => {
    const privileges = {
      elasticsearch: {
        cluster: [
          {
            privilege: 'manage',
            authorized: true,
          },
          {
            privilege: 'monitor',
            authorized: true,
          },
        ],
        index: {
          index1: [
            {
              privilege: 'read',
              authorized: true,
            },
            {
              privilege: 'write',
              authorized: true,
            },
          ],
          index2: [
            {
              privilege: 'read',
              authorized: true,
            },
            {
              privilege: 'write',
              authorized: true,
            },
          ],
        },
      },
      kibana: [],
    };

    const result = _formatPrivileges(privileges);

    expect(result).toEqual({
      elasticsearch: {
        cluster: {
          manage: true,
          monitor: true,
        },
        index: {
          index1: {
            read: true,
            write: true,
          },
          index2: {
            read: true,
            write: true,
          },
        },
      },
      kibana: {},
    });
  });

  it('should correctly extract read and write permissions from elasticsearch cluster privileges', () => {
    const privileges = {
      elasticsearch: {
        cluster: [
          {
            privilege: 'read',
            authorized: true,
          },
          {
            privilege: 'write',
            authorized: false,
          },
        ],
        index: {},
      },
      kibana: [],
    };

    const result = hasReadWritePermissions(privileges.elasticsearch);

    expect(result).toEqual({
      has_read_permissions: true,
      has_write_permissions: false,
    });
  });
  it('should correctly extract read and write permissions from elasticsearch index privileges', () => {
    const privileges = {
      elasticsearch: {
        cluster: [],
        index: {
          [ASSET_CRITICALITY_INDEX_PATTERN]: [
            {
              privilege: 'read',
              authorized: true,
            },
            {
              privilege: 'write',
              authorized: false,
            },
          ],
        },
      },
      kibana: [],
    };

    const result = hasReadWritePermissions(
      privileges.elasticsearch,
      ASSET_CRITICALITY_INDEX_PATTERN
    );

    expect(result).toEqual({
      has_read_permissions: true,
      has_write_permissions: false,
    });
  });
});
