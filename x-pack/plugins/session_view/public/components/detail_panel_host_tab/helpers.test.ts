/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ProcessEventHost } from '../../../common/types/process_tree';
import { DASH } from '../../constants';
import { getHostData } from './helpers';

const MOCK_HOST_DATA: ProcessEventHost = {
  architecture: 'x86_64',
  hostname: 'james-fleet-714-2',
  id: '48c1b3f1ac5da4e0057fc9f60f4d1d5d',
  ip: ['127.0.0.1', '::1', '10.132.0.50', 'fe80::7d39:3147:4d9a:f809'],
  mac: ['42:01:0a:84:00:32'],
  name: 'james-fleet-714-2',
  os: {
    family: 'centos',
    full: 'CentOS 7.9.2009',
    kernel: '3.10.0-1160.31.1.el7.x86_64 #1 SMP Thu Jun 10 13:32:12 UTC 2021',
    name: 'Linux',
    platform: 'centos',
    version: '7.9.2009',
  },
};

describe('detail panel host tab helpers tests', () => {
  it('getHostData returns fields with a dash with undefined host', () => {
    const result = getHostData(undefined);
    expect(result.architecture).toEqual(DASH);
    expect(result.hostname).toEqual(DASH);
    expect(result.id).toEqual(DASH);
    expect(result.ip).toEqual(DASH);
    expect(result.mac).toEqual(DASH);
    expect(result.name).toEqual(DASH);
    expect(result.os.family).toEqual(DASH);
    expect(result.os.full).toEqual(DASH);
    expect(result.os.kernel).toEqual(DASH);
    expect(result.os.name).toEqual(DASH);
    expect(result.os.platform).toEqual(DASH);
    expect(result.os.version).toEqual(DASH);
  });

  it('getHostData returns dashes for missing fields', () => {
    const result = getHostData({
      ...MOCK_HOST_DATA,
      ip: ['127.0.0.1', '', '', 'fe80::7d39:3147:4d9a:f809'],
      name: undefined,
      os: {
        ...MOCK_HOST_DATA.os,
        full: undefined,
        platform: undefined,
      },
    });
    expect(result.architecture).toEqual(MOCK_HOST_DATA.architecture);
    expect(result.hostname).toEqual(MOCK_HOST_DATA.hostname);
    expect(result.id).toEqual(MOCK_HOST_DATA.id);
    expect(result.ip).toEqual(['127.0.0.1', DASH, DASH, 'fe80::7d39:3147:4d9a:f809'].join(', '));
    expect(result.mac).toEqual(MOCK_HOST_DATA.mac?.join(', '));
    expect(result.name).toEqual(DASH);
    expect(result.os.family).toEqual(MOCK_HOST_DATA.os?.family);
    expect(result.os.full).toEqual(DASH);
    expect(result.os.kernel).toEqual(MOCK_HOST_DATA.os?.kernel);
    expect(result.os.name).toEqual(MOCK_HOST_DATA.os?.name);
    expect(result.os.platform).toEqual(DASH);
    expect(result.os.version).toEqual(MOCK_HOST_DATA.os?.version);
  });

  it('getHostData returns all data provided', () => {
    const result = getHostData(MOCK_HOST_DATA);
    expect(result.architecture).toEqual(MOCK_HOST_DATA.architecture);
    expect(result.hostname).toEqual(MOCK_HOST_DATA.hostname);
    expect(result.id).toEqual(MOCK_HOST_DATA.id);
    expect(result.ip).toEqual(MOCK_HOST_DATA.ip?.join(', '));
    expect(result.mac).toEqual(MOCK_HOST_DATA.mac?.join(', '));
    expect(result.name).toEqual(MOCK_HOST_DATA.name);
    expect(result.os.family).toEqual(MOCK_HOST_DATA.os?.family);
    expect(result.os.full).toEqual(MOCK_HOST_DATA.os?.full);
    expect(result.os.kernel).toEqual(MOCK_HOST_DATA.os?.kernel);
    expect(result.os.name).toEqual(MOCK_HOST_DATA.os?.name);
    expect(result.os.platform).toEqual(MOCK_HOST_DATA.os?.platform);
    expect(result.os.version).toEqual(MOCK_HOST_DATA.os?.version);
  });
});
