/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { random } from 'lodash';
import { generateCounterData } from '../../lib/generate_counter_data';
import indexTemplate from './template.json';
import { GeneratorFunction } from '../../types';

export const template = indexTemplate;
export const generateEvent: GeneratorFunction = (config, schedule, index, timestamp) => {
  const networkBytesPerSecIn = random(10000, 100000);
  const networkPacketsPerSecIn = random(10000, 100000);
  const networkBytesPerSecOut = random(10000, 100000);
  const networkPacketsPerSecOut = random(10000, 100000);

  const diskBytesPerSecRead = random(10000, 100000);
  const diskCountPerSecRead = random(10000, 100000);
  const diskBytesPerSecWrite = random(10000, 100000);
  const diskCountPerSecWrite = random(10000, 100000);

  const interval = schedule.interval ?? config.indexing.interval;

  return [
    {
      namespace: 'fake_ec2',
      '@timestamp': timestamp.toISOString(),
      aws: {
        ec2: {
          network: {
            in: {
              packets: generateCounterData(`packets-in-${index}`, networkPacketsPerSecIn, interval),
              bytes_per_sec: networkBytesPerSecIn,
              packets_per_sec: networkPacketsPerSecIn,
              bytes: generateCounterData(`bytes-in-${index}`, networkBytesPerSecIn, interval),
            },
            out: {
              packets: generateCounterData(
                `packets-out-${index}`,
                networkPacketsPerSecOut,
                interval
              ),
              bytes_per_sec: networkBytesPerSecOut,
              packets_per_sec: networkPacketsPerSecOut,
              bytes: generateCounterData(`bytes-out-${index}`, networkBytesPerSecOut, interval),
            },
          },
          status: {
            check_failed: 0,
            check_failed_instance: 0,
            check_failed_system: 0,
          },
          cpu: {
            credit_usage: 0.004566,
            credit_balance: 144,
            surplus_credit_balance: 0,
            surplus_credits_charged: 0,
            total: {
              pct: random(0, 1, true),
            },
          },
          diskio: {
            read: {
              bytes_per_sec: diskBytesPerSecRead,
              count_per_sec: diskCountPerSecRead,
              bytes: generateCounterData(
                `diskio-bytes-read-${index}`,
                diskBytesPerSecRead,
                interval
              ),
              count: generateCounterData(
                `diskio-count-read-${index}`,
                diskCountPerSecRead,
                interval
              ),
            },
            write: {
              bytes_per_sec: diskBytesPerSecWrite,
              count_per_sec: diskCountPerSecWrite,
              bytes: generateCounterData(
                `diskio-bytes-write-${index}`,
                diskBytesPerSecWrite,
                interval
              ),
              count: generateCounterData(
                `diskio-count-write-${index}`,
                diskCountPerSecWrite,
                interval
              ),
            },
          },
          instance: {
            core: {
              count: 1,
            },
            threads_per_core: 1,
            public: {
              ip: '3.122.204.80',
              dns_name: '',
            },
            private: {
              ip: '10.0.0.122',
              dns_name: 'ip-10-0-0-122.eu-central-1.compute.internal',
            },
            image: {
              id: 'ami-0b418580298265d5c',
            },
            state: {
              name: 'running',
              code: 16,
            },
            monitoring: {
              state: 'disabled',
            },
          },
        },
      },
      agent: {
        name: 'MacBook-Elastic.local',
        type: 'metricbeat',
        version: '8.0.0',
        ephemeral_id: '17803f33-b617-4ce9-a9ac-e218c02aeb4b',
        id: '12f376ef-5186-4e8b-a175-70f1140a8f30',
      },
      ecs: {
        version: '1.5.0',
      },
      event: {
        module: 'aws',
        duration: 23217499283,
        dataset: 'aws.ec2',
      },
      metricset: {
        period: interval,
        name: 'ec2',
      },
      service: {
        type: 'aws',
      },
      cloud: {
        provider: 'aws',
        region: 'eu-central-1',
        account: {
          name: 'elastic-beats',
          id: '428152502467',
        },
        instance: {
          id: `instance-${index}`,
          name: 'testing',
        },
        machine: {
          type: 't2.micro',
        },
        availability_zone: 'eu-central-1a',
      },
    },
  ];
};
