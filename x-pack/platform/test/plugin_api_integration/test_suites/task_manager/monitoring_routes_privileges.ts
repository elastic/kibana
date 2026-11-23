/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { MonitoredHealth } from '@kbn/task-manager-plugin/server/routes/health';
import type { NodeMetrics } from '@kbn/task-manager-plugin/server/routes/metrics';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { scheduleTask } from './test_utils';

const CANARY_TASK_ID = 'task-manager-monitoring-routes-privileges-canary';
const CANARY_INTERVAL = '47s';

interface TestUser {
  username: string;
  fullName: string;
  password: string;
  description: string;
  role: {
    name: string;
    elasticsearch?: { cluster: string[] };
    kibana?: Array<{ base: string[]; spaces: string[] }>;
  };
}

const UNPRIVILEGED_USER: TestUser = {
  username: 'tm_monitoring_space_all',
  fullName: 'tm_monitoring_space_all',
  password: 'tm_monitoring_space_all-password',
  description: 'all privileges in the default space only',
  role: {
    name: 'tm_monitoring_space_all_role',
    kibana: [{ base: ['all'], spaces: ['default'] }],
  },
};

const PRIVILEGED_USERS: TestUser[] = [
  {
    username: 'tm_monitoring_cluster_monitor',
    fullName: 'tm_monitoring_cluster_monitor',
    password: 'tm_monitoring_cluster_monitor-password',
    description: 'only the cluster monitor privilege',
    role: {
      name: 'tm_monitoring_cluster_monitor_role',
      elasticsearch: { cluster: ['monitor'] },
    },
  },
  {
    username: 'tm_monitoring_global_all',
    fullName: 'tm_monitoring_global_all',
    password: 'tm_monitoring_global_all-password',
    description: 'only the global Kibana all privilege',
    role: {
      name: 'tm_monitoring_global_all_role',
      kibana: [{ base: ['all'], spaces: ['*'] }],
    },
  },
];

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');
  const retry = getService('retry');

  const getHealth = async ({ username, password }: TestUser): Promise<MonitoredHealth> =>
    (
      await supertestWithoutAuth
        .get('/api/task_manager/_health')
        .auth(username, password)
        .expect(200)
    ).body;

  const getMetrics = async ({ username, password }: TestUser): Promise<NodeMetrics> =>
    (
      await supertestWithoutAuth
        .get('/api/task_manager/metrics?reset=false')
        .auth(username, password)
        .expect(200)
    ).body;

  describe('monitoring routes privileges', () => {
    let registeredTaskTypes: string[];

    const expectNoTaskDetails = (body: MonitoredHealth | NodeMetrics) => {
      const json = JSON.stringify(body);
      for (const taskType of registeredTaskTypes) {
        expect(json).not.to.contain(`"${taskType}"`);
        expect(json).not.to.contain(`"${taskType.replaceAll('.', '__')}"`);
      }
      expect(json).not.to.contain(CANARY_TASK_ID);
      expect(json).not.to.contain(`"${CANARY_INTERVAL}"`);
    };

    before(async () => {
      registeredTaskTypes = (await supertest.get('/api/registered_tasks').expect(200)).body;

      for (const {
        username,
        fullName,
        password,
        role: { name, ...role },
      } of [UNPRIVILEGED_USER, ...PRIVILEGED_USERS]) {
        await security.role.create(name, role);
        await security.user.create(username, { password, full_name: fullName, roles: [name] });
      }

      await scheduleTask(supertest, {
        id: CANARY_TASK_ID,
        taskType: 'sampleTask',
        schedule: { interval: CANARY_INTERVAL },
        params: {},
      });

      await retry.try(async () => {
        const health: MonitoredHealth = (
          await supertest.get('/api/task_manager/_health').expect(200)
        ).body;
        expect(health.stats.workload?.value.task_types.sampleTask).to.be.ok();
        expect(health.stats.runtime?.value.drift_by_type.sampleTask).to.be.ok();
        expect(health.stats.workload?.value.schedule.map(([interval]) => interval)).to.contain(
          CANARY_INTERVAL
        );
      });

      await retry.try(async () => {
        const metrics: NodeMetrics = (
          await supertest.get('/api/task_manager/metrics?reset=false').expect(200)
        ).body;
        expect(metrics.metrics?.task_run?.value.by_type.sampleTask).to.be.ok();
      });
    });

    after(async () => {
      await supertest.delete('/api/sample_tasks').set('kbn-xsrf', 'xxx').expect(200);
      for (const { username, role } of [UNPRIVILEGED_USER, ...PRIVILEGED_USERS]) {
        await security.user.delete(username);
        await security.role.delete(role.name);
      }
    });

    it(`redacts task details from _health for a user with ${UNPRIVILEGED_USER.description}`, async () => {
      const health = await getHealth(UNPRIVILEGED_USER);

      expect(health.stats.configuration?.value.poll_interval).to.be.a('number');
      expect(health.stats.configuration?.value.monitored_task_execution_thresholds.custom).to.eql(
        {}
      );
      expect(health.stats.configuration?.value.execution_control.paused_task_types).to.eql([]);
      expect(health.stats.workload?.value.count).to.be.a('number');
      expect(health.stats.workload?.value.task_types).to.eql({});
      expect(health.stats.workload?.value.schedule).to.eql([]);
      expect(health.stats.runtime?.value.drift).to.be.ok();
      expect(health.stats.runtime?.value.drift_by_type).to.eql({});
      expect(health.stats.runtime?.value.execution.duration).to.eql({});
      expect(health.stats.runtime?.value.execution.result_frequency_percent_as_number).to.eql({});
      expect(health.stats.capacity_estimation?.value.observed).to.be.ok();
      expectNoTaskDetails(health);
    });

    it(`redacts task details from metrics for a user with ${UNPRIVILEGED_USER.description}`, async () => {
      const metrics = await getMetrics(UNPRIVILEGED_USER);

      expect(metrics.metrics?.task_run?.value.overall.total).to.be.a('number');
      expect(metrics.metrics?.task_run?.value.by_type).to.eql({});
      expectNoTaskDetails(metrics);
    });

    for (const user of PRIVILEGED_USERS) {
      it(`returns task details from _health and metrics for a user with ${user.description}`, async () => {
        const health = await getHealth(user);
        expect(health.stats.workload?.value.task_types.sampleTask).to.be.ok();
        expect(health.stats.workload?.value.schedule.map(([interval]) => interval)).to.contain(
          CANARY_INTERVAL
        );

        await retry.try(async () => {
          const metrics = await getMetrics(user);
          expect(metrics.metrics?.task_run?.value.by_type.sampleTask).to.be.ok();
        });
      });
    }
  });
}
