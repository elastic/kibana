/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import url from 'url';
import supertest from 'supertest';
import { MonitoredUtilization } from '@kbn/task-manager-plugin/server/routes/background_task_utilization';
import { MonitoredStat } from '@kbn/task-manager-plugin/server/monitoring/monitoring_stats_stream';
import { BackgroundTaskUtilizationStat } from '@kbn/task-manager-plugin/server/monitoring/background_task_utilization_statistics';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const config = getService('config');
  const retry = getService('retry');
  const request = supertest(url.format(config.get('servers.kibana')));

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  function getUtilizationRequest(isInternal: boolean = true) {
    return request
      .get(`/${isInternal ? 'internal' : 'api'}/task_manager/_background_task_utilization`)
      .set('kbn-xsrf', 'foo');
  }

  function getUtilization(isInternal: boolean = true): Promise<MonitoredUtilization> {
    return getUtilizationRequest(isInternal)
      .expect(200)
      .then((response) => response.body);
  }

  function getBackgroundTaskUtilization(isInternal: boolean = true): Promise<MonitoredUtilization> {
    return retry.try(async () => {
      const utilization = await getUtilization(isInternal);

      if (utilization.stats) {
        return utilization;
      }

      await delay(500);
      throw new Error('Stats have not run yet');
    });
  }

  describe('background task utilization', () => {
    it('should return the task manager background task utilization for recurring stats', async () => {
      const {
        value: {
          recurring: { ran },
        },
      } = (await getBackgroundTaskUtilization(true))
        .stats as MonitoredStat<BackgroundTaskUtilizationStat>;
      const serviceTime = ran.service_time;
      expect(typeof serviceTime.actual).to.eql('number');
      expect(typeof serviceTime.adjusted).to.eql('number');
      expect(typeof serviceTime.task_counter).to.eql('number');
    });

    it('should return the task manager background task utilization for adhoc stats', async () => {
      const {
        value: {
          adhoc: { created, ran },
        },
      } = (await getBackgroundTaskUtilization(true))
        .stats as MonitoredStat<BackgroundTaskUtilizationStat>;
      const serviceTime = ran.service_time;
      expect(typeof created.counter).to.eql('number');

      expect(typeof serviceTime.actual).to.eql('number');
      expect(typeof serviceTime.adjusted).to.eql('number');
      expect(typeof serviceTime.task_counter).to.eql('number');
    });

    it('should include load stat', async () => {
      const {
        value: { load },
      } = (await getBackgroundTaskUtilization(true))
        .stats as MonitoredStat<BackgroundTaskUtilizationStat>;
      expect(typeof load).to.eql('number');
    });

    it('should return expected fields for internal route', async () => {
      const monitoredStat = (await getBackgroundTaskUtilization(true)).stats;
      expect(monitoredStat?.timestamp).not.to.be(undefined);
      expect(monitoredStat?.value).not.to.be(undefined);
      expect(monitoredStat?.value?.adhoc).not.to.be(undefined);
      expect(monitoredStat?.value?.recurring).not.to.be(undefined);
      expect(monitoredStat?.value?.load).not.to.be(undefined);
    });

    it('should return expected fields for public route', async () => {
      const monitoredStat = (await getBackgroundTaskUtilization(false)).stats;
      expect(monitoredStat?.timestamp).not.to.be(undefined);
      expect(monitoredStat?.value).not.to.be(undefined);
      expect(monitoredStat?.value?.adhoc).to.be(undefined);
      expect(monitoredStat?.value?.recurring).to.be(undefined);
      expect(monitoredStat?.value?.load).not.to.be(undefined);
    });
  });
}
