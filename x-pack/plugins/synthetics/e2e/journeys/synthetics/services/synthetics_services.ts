/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import type { Client } from '@elastic/elasticsearch';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { firstDownHit, firstUpHit } from '../alert_rules/sample_docs/sample_docs';

export class SyntheticsServices {
  kibanaUrl: string;
  constructor(kibanaUrl: string) {
    this.kibanaUrl = kibanaUrl;
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
      locations: [{ id: 'us_central', isServiceManaged: true }],
      ...(data?.type !== 'browser' ? {} : data),
      ...(data || {}),
      name,
    };
    try {
      await axios.post(this.kibanaUrl + '/internal/uptime/service/monitors', testData, {
        auth: { username: 'elastic', password: 'changeme' },
        headers: { 'kbn-xsrf': 'true' },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(e));
    }
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

  async addTestSummaryDocument(
    params: Record<string, any>,
    {
      isDown = false,
      timestamp = new Date(Date.now()).toISOString(),
      monitorId,
      name,
    }: { monitorId?: string; isDown?: boolean; timestamp?: string; name?: string } = {}
  ) {
    const getService = params.getService;
    const es: Client = getService('es');
    await es.index({
      index: 'synthetics-http-default',
      document: {
        ...(isDown ? firstDownHit({ timestamp, monitorId, name }) : firstUpHit),
        '@timestamp': timestamp,
      },
    });
  }

  async cleaUpAlerts(params: Record<string, any>) {
    const getService = params.getService;
    const es: Client = getService('es');
    const listOfIndices = await es.cat.indices({ format: 'json' });
    for (const index of listOfIndices) {
      if (index.index?.startsWith('.internal.alerts-observability.uptime.alerts')) {
        await es.deleteByQuery({ index: index.index, query: { match_all: {} } });
      }
    }
  }

  async cleanTestMonitors(params: Record<string, any>) {
    const getService = params.getService;
    const server = getService('kibanaServer');

    try {
      await server.savedObjects.clean({ types: ['synthetics-monitor'] });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  }
}
