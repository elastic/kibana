/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sample, random } from 'lodash';
import { v4 } from 'uuid';
import moment from 'moment';
import { GeneratorFunction } from '../../types';
import { generateCounterData } from '../../lib/generate_counter_data';
import indexTemplate from './template.json';
export const template = indexTemplate;

const NAMESPACES = ['kube-system', 'elasticsearch', 'kibana', 'nginx', 'mysql'];

const NODES = ['node-01', 'node-02', 'node-03', 'node-04', 'node-05'];

const CONTAINERS = ['container-01', 'container-02', 'container-03', 'container-04', 'container-05'];

const UUIDS: Record<number, string> = {};
const generateUUID = (index: number) => {
  const id = UUIDS[index] || v4();
  UUIDS[index] = id;
  return id;
};

export const generateEvent: GeneratorFunction = (config, schedule, index, timestamp) => {
  const interval = schedule.interval ?? config.indexing.interval;
  return [
    {
      namespace: 'fake_k8s',
      '@timestamp': timestamp.toISOString(),
      event: {
        dataset: 'kubernetes.pod',
        duration: 115000,
        module: 'kubernetes',
      },
      kubernetes: {
        namespace: sample(NAMESPACES),
        node: {
          name: sample(NODES),
        },
        pod: {
          host_ip: '192.168.99.100',
          ip: '172.17.0.2',
          uid: generateUUID(index),
          name: `pod-${index}`,
          status: {
            phase: 'running',
            ready: 'true',
            scheduled: 'true',
          },
          startTime: moment().startOf('day').toISOString(),
          network: {
            rx: {
              bytes: generateCounterData(`rx-bytes-${index}`, random(10000, 100000), interval),
              errors: generateCounterData(`rx-errors-${index}`, random(1, 100), interval),
            },
            tx: {
              bytes: generateCounterData(`tx-bytes-${index}`, random(10000, 100000), interval),
              errors: generateCounterData(`tx-errors-${index}`, random(1, 100), interval),
            },
          },
          cpu: {
            usage: {
              nanocores: 1,
              node: {
                pct: random(0, 1, true),
              },
              limit: {
                pct: random(0, 1, true),
              },
            },
          },
          memory: {
            usage: {
              bytes: random(1000, 104_857_600),
              node: {
                pct: random(0, 1, true),
              },
              limit: {
                pct: random(0, 1, true),
              },
              available: {
                bytes: random(1000, 104_857_600),
              },
              working_set: {
                bytes: random(1000, 104_857_600),
              },
              rss: {
                bytes: random(1000, 104_857_600),
              },
              page_faults: 0,
              major_page_faults: 0,
            },
          },
        },
      },
      metricset: {
        name: 'pod',
        period: interval,
      },
      service: {
        address: '127.0.0.1:55555',
        type: 'kubernetes',
      },
      container: {
        id: sample(CONTAINERS),
        name: 'container-name',
        status: 'running',
      },
    },
  ];
};
