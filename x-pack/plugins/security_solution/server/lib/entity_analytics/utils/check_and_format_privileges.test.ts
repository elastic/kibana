/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { _formatPrivileges } from './check_and_format_privileges';

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
    });
  });
});
