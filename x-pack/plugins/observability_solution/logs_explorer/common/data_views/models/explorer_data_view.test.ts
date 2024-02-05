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
    expect(ExplorerDataView.create({ id, title: 'auditbeat*' }).isLogsDataType()).toBeTruthy();
    expect(ExplorerDataView.create({ id, title: 'auditbeat-*' }).isLogsDataType()).toBeTruthy();
    expect(ExplorerDataView.create({ id, title: 'logs*' }).isLogsDataType()).toBeTruthy();
    expect(ExplorerDataView.create({ id, title: 'logs-*' }).isLogsDataType()).toBeTruthy();
    expect(ExplorerDataView.create({ id, title: 'logs-*-*' }).isLogsDataType()).toBeTruthy();
    expect(
      ExplorerDataView.create({ id, title: 'logs-system.syslog-*' }).isLogsDataType()
    ).toBeTruthy();
    expect(
      ExplorerDataView.create({ id, title: 'logs-system.syslog-default' }).isLogsDataType()
    ).toBeTruthy();
    expect(ExplorerDataView.create({ id, title: 'cluster1:logs-*' }).isLogsDataType()).toBeTruthy();
    expect(
      ExplorerDataView.create({ id, title: 'cluster1:logs-*-*' }).isLogsDataType()
    ).toBeTruthy();
    expect(
      ExplorerDataView.create({ id, title: 'cluster1:logs-system.syslog-*' }).isLogsDataType()
    ).toBeTruthy();
    expect(
      ExplorerDataView.create({
        id,
        title: 'cluster1:logs-system.syslog-default',
      }).isLogsDataType()
    ).toBeTruthy();
    expect(
      ExplorerDataView.create({ id, title: 'logs-*,cluster1:logs-*' }).isLogsDataType()
    ).toBeTruthy();
    expect(
      ExplorerDataView.create({ id, title: 'logs-*,cluster1:logs-*,' }).isLogsDataType()
    ).toBeTruthy();
    expect(
      ExplorerDataView.create({ id, title: 'cluster1:logs-*,cluster2:logs-*' }).isLogsDataType()
    ).toBeTruthy();
    expect(
      ExplorerDataView.create({ id, title: 'cluster1:logs-*,cluster2:logs-*' }).isLogsDataType()
    ).toBeTruthy();
    expect(
      ExplorerDataView.create({
        id,
        title: '*:logs-system.syslog-*,*:logs-system.errors-*',
      }).isLogsDataType()
    ).toBeTruthy();

    // Assert falsy cases
    expect(ExplorerDataView.create({ id, title: 'auditbeats*' }).isLogsDataType()).toBeFalsy();
    expect(ExplorerDataView.create({ id, title: 'auditbeats-*' }).isLogsDataType()).toBeFalsy();
    expect(ExplorerDataView.create({ id, title: 'logss*' }).isLogsDataType()).toBeFalsy();
    expect(ExplorerDataView.create({ id, title: 'logss-*' }).isLogsDataType()).toBeFalsy();
    expect(ExplorerDataView.create({ id, title: 'metrics*' }).isLogsDataType()).toBeFalsy();
    expect(ExplorerDataView.create({ id, title: 'metrics-*' }).isLogsDataType()).toBeFalsy();
    expect(
      ExplorerDataView.create({
        id,
        title: '*:metrics-system.syslog-*,logs-system.errors-*',
      }).isLogsDataType()
    ).toBeFalsy();
    expect(
      ExplorerDataView.create({ id, title: 'cluster1:logs-*,clust,er2:logs-*' }).isLogsDataType()
    ).toBeFalsy();
    expect(
      ExplorerDataView.create({ id, title: 'cluster1:logs-*,    cluster2:logs-*' }).isLogsDataType()
    ).toBeFalsy();
  });
});
