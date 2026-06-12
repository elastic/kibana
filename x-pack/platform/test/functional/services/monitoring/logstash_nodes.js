/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { range } from 'lodash';
export function MonitoringLogstashNodesProvider({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['monitoring']);
  const find = getService('find');

  const SUBJ_OVERVIEW_PAGE = 'logstashNodesPage';
  const SUBJ_TABLE_CONTAINER = 'logstashNodesTableContainer';
  const SUBJ_SEARCH_BAR = `${SUBJ_TABLE_CONTAINER} > monitoringTableToolBar`;
  const SUBJ_TABLE_NO_DATA = `${SUBJ_TABLE_CONTAINER} > monitoringTableNoData`;
  const SUBJ_NODE_NAME = `${SUBJ_TABLE_CONTAINER} > name`;
  const SUBJ_NODE_ALERT_STATUS = `${SUBJ_TABLE_CONTAINER} > alertStatusText`;
  const SUBJ_NODE_IP = `${SUBJ_TABLE_CONTAINER} > httpAddress`;
  const SUBJ_NODE_CPU_USAGE = `${SUBJ_TABLE_CONTAINER} > cpuUsage`;
  const SUBJ_NODE_LOAD_AVERAGE = `${SUBJ_TABLE_CONTAINER} > loadAverage`;
  const SUBJ_NODE_JVM_HEAP_USED = `${SUBJ_TABLE_CONTAINER} > jvmHeapUsed`;
  const SUBJ_NODE_EVENTS_OUT = `${SUBJ_TABLE_CONTAINER} > eventsOut`;
  const SUBJ_NODE_CONFIG_RELOADS_SUCCESS = `${SUBJ_TABLE_CONTAINER} > configReloadsSuccess`;
  const SUBJ_NODE_CONFIG_RELOADS_FAILURE = `${SUBJ_TABLE_CONTAINER} > configReloadsFailure`;
  const SUBJ_NODE_VERSION = `${SUBJ_TABLE_CONTAINER} > version`;

  const SUBJ_NODE_LINK_PREFIX = `${SUBJ_TABLE_CONTAINER} > nodeLink-`;

  return new (class LogstashNodes {
    async isOnNodesListing() {
      const pageId = await retry.try(() => testSubjects.find(SUBJ_OVERVIEW_PAGE));
      return pageId !== null;
    }
    async clickRowByResolver(nodeResolver) {
      await retry.waitForWithTimeout('redirection to node detail', 30000, async () => {
        await testSubjects.click(SUBJ_NODE_LINK_PREFIX + nodeResolver, 5000);
        return testSubjects.exists('logstashDetailStatus', { timeout: 5000 });
      });
    }
    getRows() {
      return PageObjects.monitoring.tableGetRowsFromContainer(SUBJ_TABLE_CONTAINER);
    }
    async setFilter(text) {
      await PageObjects.monitoring.tableSetFilter(SUBJ_SEARCH_BAR, text);
      await this.waitForTableToFinishLoading();
    }

    async clearFilter() {
      await PageObjects.monitoring.tableClearFilter(SUBJ_SEARCH_BAR);
      await this.waitForTableToFinishLoading();
    }

    assertNoData() {
      return PageObjects.monitoring.assertTableNoData(SUBJ_TABLE_NO_DATA);
    }
    async waitForTableToFinishLoading() {
      await retry.try(async () => {
        await find.waitForDeletedByCssSelector('.euiBasicTable-loading', 5000);
      });
    }
    async getNodesAll() {
      const name = await testSubjects.getVisibleTextAll(SUBJ_NODE_NAME);
      const alertStatus = await testSubjects.getVisibleTextAll(SUBJ_NODE_ALERT_STATUS);
      const httpAddress = await testSubjects.getVisibleTextAll(SUBJ_NODE_IP);
      const cpuUsage = await testSubjects.getVisibleTextAll(SUBJ_NODE_CPU_USAGE);
      const loadAverage = await testSubjects.getVisibleTextAll(SUBJ_NODE_LOAD_AVERAGE);
      const jvmHeapUsed = await testSubjects.getVisibleTextAll(SUBJ_NODE_JVM_HEAP_USED);
      const eventsOut = await testSubjects.getVisibleTextAll(SUBJ_NODE_EVENTS_OUT);
      const configReloadsSuccess = await testSubjects.getVisibleTextAll(
        SUBJ_NODE_CONFIG_RELOADS_SUCCESS
      );
      const configReloadsFailure = await testSubjects.getVisibleTextAll(
        SUBJ_NODE_CONFIG_RELOADS_FAILURE
      );
      const version = await testSubjects.getVisibleTextAll(SUBJ_NODE_VERSION);

      // tuple-ize the icons and texts together into an array of objects
      const tableRows = await this.getRows();
      const iterator = range(tableRows.length);
      return iterator.reduce((all, current) => {
        return [
          ...all,
          {
            id: name[current],
            httpAddress: httpAddress[current],
            alertStatus: alertStatus[current],
            cpuUsage: cpuUsage[current],
            loadAverage: loadAverage[current],
            jvmHeapUsed: jvmHeapUsed[current],
            eventsOut: eventsOut[current],
            configReloadsSuccess: configReloadsSuccess[current],
            configReloadsFailure: configReloadsFailure[current],
            version: version[current],
          },
        ];
      }, []);
    }
  })();
}
