/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import { gte } from 'semver';
import { BaseDataGenerator } from './base_data_generator';
import type { HostMetadataInterface } from '../types';
import { EndpointStatus, HostPolicyResponseActionStatus } from '../types';

/**
 * Metadata generator for docs that are sent by the Endpoint running on hosts
 */
export class EndpointMetadataGenerator extends BaseDataGenerator {
  /** Generate an Endpoint host metadata document */
  generate(overrides: DeepPartial<HostMetadataInterface> = {}): HostMetadataInterface {
    const ts = overrides['@timestamp'] ?? new Date().getTime();
    const hostName = this.randomHostname();
    const agentVersion = overrides?.agent?.version ?? this.randomVersion();
    const agentId = this.seededUUIDv4();
    const isIsolated = this.randomBoolean(0.3);
    const capabilities = ['isolation'];

    // v8.4 introduced additional endpoint capabilities
    if (gte(agentVersion, '8.4.0')) {
      capabilities.push('kill_process', 'suspend_process', 'running_processes');
    }

    const hostMetadataDoc: HostMetadataInterface = {
      '@timestamp': ts,
      event: {
        created: ts,
        id: this.seededUUIDv4(),
        kind: 'metric',
        category: ['host'],
        type: ['info'],
        module: 'endpoint',
        action: 'endpoint_metadata',
        dataset: 'endpoint.metadata',
      },
      data_stream: {
        type: 'metrics',
        dataset: 'endpoint.metadata',
        namespace: 'default',
      },
      agent: {
        version: agentVersion,
        id: agentId,
        type: 'endpoint',
      },
      elastic: {
        agent: {
          id: agentId,
        },
      },
      host: {
        id: this.seededUUIDv4(),
        hostname: hostName,
        name: hostName,
        architecture: this.randomString(10),
        ip: this.randomArray(3, () => this.randomIP()),
        mac: this.randomArray(3, () => this.randomMac()),
        os: this.randomChoice(OS),
      },
      Endpoint: {
        status: EndpointStatus.enrolled,
        policy: {
          applied: {
            name: 'With Eventing',
            id: 'C2A9093E-E289-4C0A-AA44-8C32A414FA7A',
            status: HostPolicyResponseActionStatus.success,
            endpoint_policy_version: 3,
            version: 5,
          },
        },
        configuration: {
          isolation: isIsolated,
        },
        state: {
          isolation: isIsolated,
        },
        capabilities,
      },
    };

    return merge(hostMetadataDoc, overrides);
  }
}
