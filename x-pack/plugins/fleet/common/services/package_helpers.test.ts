/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRootPrivilegesRequired } from './package_helpers';

describe('isRootPrivilegesRequired', () => {
  it('should return true if root privileges is required at root level', () => {
    const res = isRootPrivilegesRequired({
      agent: {
        privileges: {
          root: true,
        },
      },
    } as any);
    expect(res).toBe(true);
  });
  it('should return true if root privileges is required at datastreams', () => {
    const res = isRootPrivilegesRequired({
      data_streams: [
        {
          agent: {
            privileges: { root: true },
          },
        },
      ],
    } as any);
    expect(res).toBe(true);
  });

  it('should return false if root privileges is not required', () => {
    const res = isRootPrivilegesRequired({
      data_streams: [],
    } as any);
    expect(res).toBe(false);
  });
});
