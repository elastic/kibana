/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useKueryWithMobileFilters } from './use_kuery_with_mobile_filters';
describe('useKueryWithMobileFilters', () => {
  it('should return empty kuery when passing empty object ', () => {
    const { result } = renderHook(() => useKueryWithMobileFilters({}));
    expect(result.current).toBe('');
  });

  it('should handle empty and undefined values', () => {
    const { result } = renderHook(() =>
      useKueryWithMobileFilters({
        kuery: '',
        device: 'foo',
        osVersion: undefined,
      })
    );
    expect(result.current).toBe('device.model.name: foo');
  });

  it('should return only kuery when mobile filters are missing ', () => {
    const { result } = renderHook(() =>
      useKueryWithMobileFilters({ kuery: 'foo.bar: test' })
    );
    expect(result.current).toBe('foo.bar: test');
  });

  it('should return only mobile filters as KQL when kuery is missing ', () => {
    const { result } = renderHook(() =>
      useKueryWithMobileFilters({
        device: 'foo',
        osVersion: 'bar',
        netConnectionType: 'fooBar',
        appVersion: '1.0',
      })
    );
    expect(result.current).toBe(
      'device.model.name: foo and host.os.version: bar and service.version: 1.0 and network.connection.type: fooBar'
    );
  });

  it('should return mobile filters and kuery as KQL', () => {
    const { result } = renderHook(() =>
      useKueryWithMobileFilters({
        kuery: 'foo.bar.test: test',
        device: 'foo',
        osVersion: 'bar',
        netConnectionType: 'fooBar',
        appVersion: '1.0',
      })
    );

    expect(result.current).toBe(
      'foo.bar.test: test and device.model.name: foo and host.os.version: bar and service.version: 1.0 and network.connection.type: fooBar'
    );
  });

  it('should escape mobile filters values', () => {
    const { result } = renderHook(() =>
      useKueryWithMobileFilters({
        kuery: 'foo.bar.test: test',
        device: 'foo>.',
        osVersion: 'bar**',
        netConnectionType: 'fooBar)45',
        appVersion: '1.0():',
      })
    );

    expect(result.current).toBe(
      'foo.bar.test: test and device.model.name: foo\\>. and host.os.version: bar\\*\\* and service.version: 1.0\\(\\)\\: and network.connection.type: fooBar\\)45'
    );
  });
});
