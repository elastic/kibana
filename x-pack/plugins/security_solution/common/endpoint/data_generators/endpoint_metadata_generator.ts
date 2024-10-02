/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type { DeepPartial } from 'utility-types';
import { merge, set } from 'lodash';
import { gte } from 'semver';
import type { EndpointCapabilities } from '../service/response_actions/constants';
import { BaseDataGenerator } from './base_data_generator';
import type { HostMetadataInterface, OSFields, HostInfoInterface } from '../types';
import { EndpointStatus, HostPolicyResponseActionStatus, HostStatus } from '../types';

export interface GetCustomEndpointMetadataGeneratorOptions {
  /** Version for agent/endpoint. Defaults to the stack version */
  version: string;
  /** OS type for the generated endpoint hosts */
  os: 'macOS' | 'windows' | 'linux';
  isolation: boolean;
}

/**
 * Metadata generator for docs that are sent by the Endpoint running on hosts
 */
export class EndpointMetadataGenerator extends BaseDataGenerator {
  /**
   * Returns a Custom `EndpointMetadataGenerator` subclass that will generate specific
   * documents based on input arguments
   */
  static custom({
    version,
    os,
    isolation,
  }: Partial<GetCustomEndpointMetadataGeneratorOptions> = {}): typeof EndpointMetadataGenerator {
    return class extends EndpointMetadataGenerator {
      generate(overrides: DeepPartial<HostMetadataInterface> = {}): HostMetadataInterface {
        if (version) {
          set(overrides, 'agent.version', version);
        }

        if (os) {
          switch (os) {
            case 'linux':
              set(overrides, 'host.os', EndpointMetadataGenerator.linuxOSFields);
              break;

            case 'macOS':
              set(overrides, 'host.os', EndpointMetadataGenerator.macOSFields);
              break;

            default:
              set(overrides, 'host.os', EndpointMetadataGenerator.windowsOSFields);
          }
        }
        if (isolation !== undefined) {
          set(overrides, 'Endpoint.state.isolation', isolation);
        }

        return super.generate(overrides);
      }
    };
  }

  public static get windowsOSFields(): OSFields {
    return {
      name: 'Windows',
      full: 'Windows 10',
      version: '10.0',
      platform: 'Windows',
      family: 'windows',
      Ext: {
        variant: 'Windows Pro',
      },
    };
  }

  public static get linuxOSFields(): OSFields {
    return {
      Ext: {
        variant: 'Debian',
      },
      kernel: '4.19.0-21-cloud-amd64 #1 SMP Debian 4.19.249-2 (2022-06-30)',
      name: 'Linux',
      family: 'debian',
      type: 'linux',
      version: '10.12',
      platform: 'debian',
      full: 'Debian 10.12',
    };
  }

  public static get macOSFields(): OSFields {
    return {
      name: 'macOS',
      full: 'macOS Monterey',
      version: '12.6.1',
      platform: 'macOS',
      family: 'Darwin',
      Ext: {
        variant: 'Darwin',
      },
    };
  }

  /** Generate an Endpoint host metadata document */
  generate(overrides: DeepPartial<HostMetadataInterface> = {}): HostMetadataInterface {
    const ts = overrides['@timestamp'] ?? new Date().getTime();
    const hostName = overrides?.host?.hostname ?? this.randomHostname();
    const agentVersion = overrides?.agent?.version ?? this.randomVersion();
    const agentId = this.seededUUIDv4();
    const isIsolated = overrides?.Endpoint?.state?.isolation ?? this.randomBoolean(0.3);
    const capabilities: EndpointCapabilities[] = ['isolation'];

    // v8.4 introduced additional endpoint capabilities
    if (gte(agentVersion, '8.4.0')) {
      capabilities.push('kill_process', 'suspend_process', 'running_processes');
    }

    if (gte(agentVersion, '8.6.0')) {
      capabilities.push('get_file');
    }

    // v8.8 introduced execute capability
    if (gte(agentVersion, '8.8.0')) {
      capabilities.push('execute');
    }

    // v8.9 introduced `upload` capability
    if (gte(agentVersion, '8.9.0')) {
      capabilities.push('upload_file');
    }

    // v8.15 introduced `scan` capability
    if (gte(agentVersion, '8.15.0')) {
      capabilities.push('scan');
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
        os: this.randomOsFields(),
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

  /** Generates the complete `HostInfo` as returned by a call to the Endpoint host details api */
  generateHostInfo(overrides: DeepPartial<HostInfoInterface> = {}): HostInfoInterface {
    const hostInfo: HostInfoInterface = {
      metadata: this.generate(),
      host_status: HostStatus.HEALTHY,
      policy_info: {
        endpoint: {
          id: 'policy-123',
          revision: 4,
        },
        agent: {
          applied: {
            id: 'policy-123',
            revision: 4,
          },
          configured: {
            id: 'policy-123',
            revision: 4,
          },
        },
      },
      last_checkin: new Date().toISOString(),
    };
    return merge(hostInfo, overrides);
  }

  protected randomOsFields(): OSFields {
    return this.randomChoice([
      EndpointMetadataGenerator.windowsOSFields,
      {
        name: 'Windows',
        full: 'Windows Server 2016',
        version: '10.0',
        platform: 'Windows',
        family: 'windows',
        Ext: {
          variant: 'Windows Server',
        },
      },
      {
        name: 'Windows',
        full: 'Windows Server 2012',
        version: '6.2',
        platform: 'Windows',
        family: 'windows',
        Ext: {
          variant: 'Windows Server',
        },
      },
      {
        name: 'Windows',
        full: 'Windows Server 2012R2',
        version: '6.3',
        platform: 'Windows',
        family: 'windows',
        Ext: {
          variant: 'Windows Server Release 2',
        },
      },
      EndpointMetadataGenerator.linuxOSFields,
      EndpointMetadataGenerator.macOSFields,
    ]);
  }
}
