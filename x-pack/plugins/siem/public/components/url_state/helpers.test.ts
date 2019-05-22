/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isKqlForRoute } from './helpers';
import { hostsModel, networkModel, KueryFilterModel } from '../../store';
describe('isKqlForRoute', () => {
  test('host page and host page kuery', () => {
    const result = isKqlForRoute('/hosts', {
      filterQuery: {
        expression: 'host.name:"siem-kibana"',
        kind: 'kuery',
      },
      model: KueryFilterModel.hosts,
      type: hostsModel.HostsType.page,
    });
    expect(result).toBeTruthy();
  });
  test('host page and host details kuery', () => {
    const result = isKqlForRoute('/hosts', {
      filterQuery: {
        expression: 'host.name:"siem-kibana"',
        kind: 'kuery',
      },
      model: KueryFilterModel.hosts,
      type: hostsModel.HostsType.details,
    });
    expect(result).toBeFalsy();
  });
  test('host details and host details kuery', () => {
    const result = isKqlForRoute('/hosts/siem-kibana', {
      filterQuery: {
        expression: 'host.name:"siem-kibana"',
        kind: 'kuery',
      },
      model: KueryFilterModel.hosts,
      type: hostsModel.HostsType.details,
    });
    expect(result).toBeTruthy();
  });
  test('host details and host page kuery', () => {
    const result = isKqlForRoute('/hosts/siem-kibana', {
      filterQuery: {
        expression: 'host.name:"siem-kibana"',
        kind: 'kuery',
      },
      model: KueryFilterModel.hosts,
      type: hostsModel.HostsType.page,
    });
    expect(result).toBeFalsy();
  });
  test('network page and network page kuery', () => {
    const result = isKqlForRoute('/network', {
      filterQuery: {
        expression: 'network.name:"siem-kibana"',
        kind: 'kuery',
      },
      model: KueryFilterModel.network,
      type: networkModel.NetworkType.page,
    });
    expect(result).toBeTruthy();
  });
  test('network page and network details kuery', () => {
    const result = isKqlForRoute('/network', {
      filterQuery: {
        expression: 'network.name:"siem-kibana"',
        kind: 'kuery',
      },
      model: KueryFilterModel.network,
      type: networkModel.NetworkType.details,
    });
    expect(result).toBeFalsy();
  });
  test('network details and network details kuery', () => {
    const result = isKqlForRoute('/network/ip/10.100.7.198', {
      filterQuery: {
        expression: 'network.name:"siem-kibana"',
        kind: 'kuery',
      },
      model: KueryFilterModel.network,
      type: networkModel.NetworkType.details,
    });
    expect(result).toBeTruthy();
  });
  test('network details and network page kuery', () => {
    const result = isKqlForRoute('/network/ip/123.234.34', {
      filterQuery: {
        expression: 'network.name:"siem-kibana"',
        kind: 'kuery',
      },
      model: KueryFilterModel.network,
      type: networkModel.NetworkType.page,
    });
    expect(result).toBeFalsy();
  });
});
