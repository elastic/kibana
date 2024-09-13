/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getRootIntegrations,
  getRootPrivilegedDataStreams,
  isRootPrivilegesRequired,
} from './package_helpers';

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

describe('getRootPrivilegedDataStreams', () => {
  it('should return empty datastreams if root privileges is required at root level', () => {
    const res = getRootPrivilegedDataStreams({
      agent: {
        privileges: {
          root: true,
        },
      },
    } as any);
    expect(res).toEqual([]);
  });
  it('should return datastreams if root privileges is required at datastreams', () => {
    const res = getRootPrivilegedDataStreams({
      data_streams: [
        {
          name: 'syslog',
          title: 'System syslog logs',
          agent: {
            privileges: { root: true },
          },
        },
        {
          name: 'sysauth',
          title: 'System auth logs',
        },
      ],
    } as any);
    expect(res).toEqual([
      {
        name: 'syslog',
        title: 'System syslog logs',
      },
    ]);
  });
});

describe('getRootIntegrations', () => {
  it('should return packages that require root', () => {
    const res = getRootIntegrations([
      {
        package: {
          requires_root: true,
          name: 'auditd_manager',
          title: 'Auditd Manager',
        },
      } as any,
      {
        package: {
          requires_root: false,
          name: 'system',
          title: 'System',
        },
      } as any,
      {
        package: {
          name: 'test',
          title: 'Test',
        },
      } as any,
      {
        package: {
          requires_root: true,
          name: 'auditd_manager',
          title: 'Auditd Manager',
        },
      } as any,
      {} as any,
    ]);
    expect(res).toEqual([{ name: 'auditd_manager', title: 'Auditd Manager' }]);
  });

  it('should return empty array if no packages require root', () => {
    const res = getRootIntegrations([]);
    expect(res).toEqual([]);
  });
});
