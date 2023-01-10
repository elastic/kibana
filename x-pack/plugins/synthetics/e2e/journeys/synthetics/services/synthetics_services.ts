/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import type { Client } from '@elastic/elasticsearch';
import { KbnClient, uriencode } from '@kbn/test';
import pMap from 'p-map';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { journeyStart, journeySummary, step1, step2 } from './data/browser_docs';
import { firstDownHit, getUpHit } from './data/sample_docs';

export class SyntheticsServices {
  kibanaUrl: string;
  params: Record<string, any>;
  requester: KbnClient['requester'];
  constructor(params: Record<string, any>) {
    this.kibanaUrl = params.kibanaUrl;
    this.requester = params.getService('kibanaServer').requester;
    this.params = params;
  }

  async enableMonitorManagedViaApi() {
    try {
      await axios.post(this.kibanaUrl + '/internal/uptime/service/enablement', undefined, {
        auth: { username: 'elastic', password: 'changeme' },
        headers: { 'kbn-xsrf': 'true' },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  }

  async addTestMonitor(name: string, data: Record<string, any> = { type: 'browser' }) {
    const testData = {
      alert: { status: { enabled: true } },
      locations: [{ id: 'us_central', isServiceManaged: true }],
      ...(data?.type !== 'browser' ? {} : data),
      ...(data || {}),
      name,
    };
    try {
      const response = await axios.post(
        this.kibanaUrl + '/internal/uptime/service/monitors',
        testData,
        {
          auth: { username: 'elastic', password: 'changeme' },
          headers: { 'kbn-xsrf': 'true' },
        }
      );
      return response.data.id;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(e));
    }
  }

  async deleteTestMonitorByQuery(query: string) {
    const { data } = await this.requester.request({
      description: 'get monitors by name',
      path: uriencode`/internal/uptime/service/monitors`,
      query: {
        perPage: 10,
        page: 1,
        sortOrder: 'asc',
        sortField: 'name.keyword',
        query,
      },
      method: 'GET',
    });

    const { monitors = [] } = data as any;
    await pMap(
      monitors,
      async (monitor: Record<string, any>) => {
        await this.requester.request({
          description: 'delete monitor',
          path: uriencode`/internal/uptime/service/monitors/${monitor.id}`,
          method: 'DELETE',
        });
      },
      { concurrency: 10 }
    );
  }

  async enableDefaultAlertingViaApi() {
    try {
      await axios.post(
        this.kibanaUrl + SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING,
        { isDisabled: false },
        {
          auth: { username: 'elastic', password: 'changeme' },
          headers: { 'kbn-xsrf': 'true' },
        }
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  }

  async addTestSummaryDocument({
    docType = 'summaryUp',
    timestamp = new Date(Date.now()).toISOString(),
    monitorId,
    name,
    testRunId,
    stepIndex = 1,
    locationName,
    configId,
  }: {
    monitorId?: string;
    docType?: 'summaryUp' | 'summaryDown' | 'journeyStart' | 'journeyEnd' | 'stepEnd';
    timestamp?: string;
    name?: string;
    testRunId?: string;
    stepIndex?: number;
    locationName?: string;
    configId?: string;
  } = {}) {
    const getService = this.params.getService;
    const es: Client = getService('es');

    let document = {
      '@timestamp': timestamp,
    };

    let index = 'synthetics-http-default';

    const commonData = { timestamp, monitorId, name, testRunId, locationName, configId };

    switch (docType) {
      case 'stepEnd':
        index = 'synthetics-browser-default';

        const stepDoc = stepIndex === 1 ? step1(commonData) : step2(commonData);

        document = { ...stepDoc, ...document };
        break;
      case 'journeyEnd':
        index = 'synthetics-browser-default';
        document = { ...journeySummary(commonData), ...document };
        break;
      case 'journeyStart':
        index = 'synthetics-browser-default';
        document = { ...journeyStart(commonData), ...document };
        break;
      case 'summaryDown':
        document = {
          ...firstDownHit(commonData),
          ...document,
        };
        break;
      case 'summaryUp':
        document = {
          ...getUpHit(commonData),
          ...document,
        };
        break;
      default:
        document = {
          ...getUpHit(commonData),
          ...document,
        };
    }

    await es.index({
      index,
      document,
    });
  }

  async cleaUp(things: Array<'monitors' | 'alerts' | 'rules'> = ['monitors', 'alerts', 'rules']) {
    const promises = [];
    if (things.includes('monitors')) {
      promises.push(this.cleanTestMonitors());
    }
    if (things.includes('alerts')) {
      promises.push(this.cleaUpAlerts());
    }

    if (things.includes('rules')) {
      promises.push(this.cleaUpRules());
    }

    await Promise.all(promises);
  }

  async cleaUpAlerts() {
    const getService = this.params.getService;
    const es: Client = getService('es');
    const listOfIndices = await es.cat.indices({ format: 'json' });
    for (const index of listOfIndices) {
      if (index.index?.startsWith('.internal.alerts-observability.uptime.alerts')) {
        await es.deleteByQuery({ index: index.index, query: { match_all: {} } });
      }
    }
  }

  async cleaUpRules() {
    try {
      const { data: response } = await this.requester.request({
        description: 'get monitors by name',
        path: `/internal/alerting/rules/_find`,
        query: {
          per_page: 10,
          page: 1,
        },
        method: 'GET',
      });
      const { data = [] } = response as any;

      if (data.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`Deleting ${data.length} rules`);

        await axios.patch(
          this.kibanaUrl + '/internal/alerting/rules/_bulk_delete',
          {
            ids: data.map((rule: any) => rule.id),
          },
          { auth: { username: 'elastic', password: 'changeme' }, headers: { 'kbn-xsrf': 'true' } }
        );
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  }

  async cleanTestMonitors() {
    const getService = this.params.getService;
    const server = getService('kibanaServer');

    try {
      await server.savedObjects.clean({ types: ['synthetics-monitor'] });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  }
}
