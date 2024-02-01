/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExplorerDataView } from './explorer_data_view';

describe('ExplorerDataView', () => {
  it('should correctly assert whether a data view has "logs" type', () => {
    const id = 'test-id';

    // Assert truthy cases
    expect(ExplorerDataView.create({ id, title: 'auditbeat*' }).isLogDataType()).toBeTruthy();
    expect(ExplorerDataView.create({ id, title: 'auditbeat-*' }).isLogDataType()).toBeTruthy();
    expect(ExplorerDataView.create({ id, title: 'logs*' }).isLogDataType()).toBeTruthy();
    expect(ExplorerDataView.create({ id, title: 'logs-*' }).isLogDataType()).toBeTruthy();
    expect(ExplorerDataView.create({ id, title: 'logs-*-*' }).isLogDataType()).toBeTruthy();
    expect(
      ExplorerDataView.create({ id, title: 'logs-system.syslog-*' }).isLogDataType()
    ).toBeTruthy();
    expect(
      ExplorerDataView.create({ id, title: 'logs-system.syslog-default' }).isLogDataType()
    ).toBeTruthy();
    expect(ExplorerDataView.create({ id, title: 'cluster1:logs-*' }).isLogDataType()).toBeTruthy();
    expect(
      ExplorerDataView.create({ id, title: 'cluster1:logs-*-*' }).isLogDataType()
    ).toBeTruthy();
    expect(
      ExplorerDataView.create({ id, title: 'cluster1:logs-system.syslog-*' }).isLogDataType()
    ).toBeTruthy();
    expect(
      ExplorerDataView.create({
        id,
        title: 'cluster1:logs-system.syslog-default',
      }).isLogDataType()
    ).toBeTruthy();
    expect(
      ExplorerDataView.create({ id, title: 'logs-*,cluster1:logs-*' }).isLogDataType()
    ).toBeTruthy();
    expect(
      ExplorerDataView.create({ id, title: 'logs-*,cluster1:logs-*,' }).isLogDataType()
    ).toBeTruthy();
    expect(
      ExplorerDataView.create({ id, title: 'cluster1:logs-*,cluster2:logs-*' }).isLogDataType()
    ).toBeTruthy();
    expect(
      ExplorerDataView.create({ id, title: 'cluster1:logs-*,cluster2:logs-*' }).isLogDataType()
    ).toBeTruthy();
    expect(
      ExplorerDataView.create({
        id,
        title: '*:logs-system.syslog-*,*:logs-system.errors-*',
      }).isLogDataType()
    ).toBeTruthy();

    // Assert falsy cases
    expect(ExplorerDataView.create({ id, title: 'auditbeats*' }).isLogDataType()).toBeFalsy();
    expect(ExplorerDataView.create({ id, title: 'auditbeats-*' }).isLogDataType()).toBeFalsy();
    expect(ExplorerDataView.create({ id, title: 'logss*' }).isLogDataType()).toBeFalsy();
    expect(ExplorerDataView.create({ id, title: 'logss-*' }).isLogDataType()).toBeFalsy();
    expect(ExplorerDataView.create({ id, title: 'metrics*' }).isLogDataType()).toBeFalsy();
    expect(ExplorerDataView.create({ id, title: 'metrics-*' }).isLogDataType()).toBeFalsy();
    expect(
      ExplorerDataView.create({
        id,
        title: '*:metrics-system.syslog-*,logs-system.errors-*',
      }).isLogDataType()
    ).toBeFalsy();
    expect(
      ExplorerDataView.create({ id, title: 'cluster1:logs-*,clust,er2:logs-*' }).isLogDataType()
    ).toBeFalsy();
    expect(
      ExplorerDataView.create({ id, title: 'cluster1:logs-*,    cluster2:logs-*' }).isLogDataType()
    ).toBeFalsy();
  });
});
