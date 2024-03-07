/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getKueryWithMobileFilters,
  getKueryWithMobileCrashFilter,
  getKueryWithMobileErrorFilter,
} from './get_kuery_with_mobile_filters';
describe('getKueryWithMobileFilters', () => {
  it('should handle empty and undefined values', () => {
    const result = getKueryWithMobileFilters({
      kuery: '',
      device: 'foo',
      osVersion: undefined,
      appVersion: '',
      netConnectionType: undefined,
    });
    expect(result).toBe('device.model.identifier: foo');
  });

  it('should return only kuery when mobile filters are missing ', () => {
    const result = getKueryWithMobileFilters({
      kuery: 'foo.bar: test',
      device: undefined,
      osVersion: undefined,
      appVersion: undefined,
      netConnectionType: undefined,
    });
    expect(result).toBe('foo.bar: test');
  });

  it('should return only mobile filters as KQL when kuery is missing ', () => {
    const result = getKueryWithMobileFilters({
      device: 'foo',
      osVersion: 'bar',
      netConnectionType: 'fooBar',
      appVersion: '1.0',
      kuery: '',
    });
    expect(result).toBe(
      'device.model.identifier: foo and host.os.version: bar and service.version: 1.0 and network.connection.type: fooBar'
    );
  });

  it('should return mobile filters and kuery as KQL', () => {
    const result = getKueryWithMobileFilters({
      kuery: 'foo.bar.test: test',
      device: 'foo',
      osVersion: 'bar',
      netConnectionType: 'fooBar',
      appVersion: '1.0',
    });

    expect(result).toBe(
      'foo.bar.test: test and device.model.identifier: foo and host.os.version: bar and service.version: 1.0 and network.connection.type: fooBar'
    );
  });

  it('should escape mobile filters values', () => {
    const result = getKueryWithMobileFilters({
      kuery: 'foo.bar.test: test',
      device: 'foo>.',
      osVersion: 'bar**',
      netConnectionType: 'fooBar)45',
      appVersion: '1.0():',
    });

    expect(result).toBe(
      'foo.bar.test: test and device.model.identifier: foo\\>. and host.os.version: bar\\*\\* and service.version: 1.0\\(\\)\\: and network.connection.type: fooBar\\)45'
    );
  });
});

describe('getKueryWithMobileCrashFilter', () => {
  it('should handle empty and undefined values', () => {
    const result = getKueryWithMobileCrashFilter({
      groupId: undefined,
      kuery: '',
    });
    expect(result).toBe('error.type: crash');
  });
  it('should return kuery and crash filter when groupId is empty', () => {
    const result = getKueryWithMobileCrashFilter({
      groupId: undefined,
      kuery: 'foo.bar: test',
    });
    expect(result).toBe('foo.bar: test and error.type: crash');
  });
  it('should return crash filter and groupId when kuery is empty', () => {
    const result = getKueryWithMobileCrashFilter({
      groupId: '1',
      kuery: '',
    });
    expect(result).toBe('error.type: crash and error.grouping_key: 1');
  });
  it('should return crash filter, groupId, and kuery in kql format', () => {
    const result = getKueryWithMobileCrashFilter({
      groupId: '1',
      kuery: 'foo.bar: test',
    });
    expect(result).toBe(
      'foo.bar: test and error.type: crash and error.grouping_key: 1'
    );
  });
});
describe('getKueryWithMobileErrorFilter', () => {
  it('should handle empty and undefined values', () => {
    const result = getKueryWithMobileErrorFilter({
      groupId: undefined,
      kuery: '',
    });
    expect(result).toBe('NOT error.type: crash');
  });
  it('should return kuery and error filter when groupId is empty', () => {
    const result = getKueryWithMobileErrorFilter({
      kuery: 'foo.bar: test',
      groupId: undefined,
    });
    expect(result).toBe('foo.bar: test and NOT error.type: crash');
  });
  it('should return error filter and groupId when kuery is empty', () => {
    const result = getKueryWithMobileErrorFilter({
      groupId: '1',
      kuery: '',
    });
    expect(result).toBe('NOT error.type: crash and error.grouping_key: 1');
  });
  it('should return error filter, groupId, and kuery in kql format', () => {
    const result = getKueryWithMobileErrorFilter({
      groupId: '1',
      kuery: 'foo.bar: test',
    });
    expect(result).toBe(
      'foo.bar: test and NOT error.type: crash and error.grouping_key: 1'
    );
  });
});
