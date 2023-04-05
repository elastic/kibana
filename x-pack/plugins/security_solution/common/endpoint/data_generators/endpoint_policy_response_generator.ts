/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepPartial } from '@kbn/utility-types';
import { kibanaPackageJson } from '@kbn/repo-info';
import { mergeWith } from 'lodash';
import { BaseDataGenerator } from './base_data_generator';
import type { HostPolicyResponse } from '../types';
import { HostPolicyResponseActionStatus } from '../types';

const mergeAndReplaceArrays = <T, S>(destinationObj: T, srcObj: S): T => {
  const customizer = (objValue: T[keyof T], srcValue: S[keyof S]) => {
    if (Array.isArray(objValue)) {
      return srcValue;
    }
  };

  return mergeWith(destinationObj, srcObj, customizer);
};

export class EndpointPolicyResponseGenerator extends BaseDataGenerator {
  generate(overrides: DeepPartial<HostPolicyResponse> = {}): HostPolicyResponse {
    const ts = overrides['@timestamp'] ?? new Date().getTime();
    const agentVersion = overrides.agent?.id ?? this.seededUUIDv4();
    const overallStatus =
      overrides.Endpoint?.policy?.applied?.status ?? this.randomHostPolicyResponseActionStatus();

    const policyResponse: HostPolicyResponse = mergeAndReplaceArrays(
      {
        data_stream: {
          type: 'metrics',
          dataset: 'endpoint.policy',
          namespace: 'default',
        },
        '@timestamp': ts,
        agent: {
          id: agentVersion,
          version: kibanaPackageJson.version,
        },
        elastic: {
          agent: {
            id: agentVersion,
          },
        },
        ecs: {
          version: '1.4.0',
        },
        host: {
          id: this.seededUUIDv4(),
        },
        Endpoint: {
          policy: {
            applied: {
              actions: [
                {
                  name: 'configure_elasticsearch_connection',
                  message: 'elasticsearch comes configured successfully',
                  status: HostPolicyResponseActionStatus.success,
                },
                {
                  name: 'configure_kernel',
                  message: 'Failed to configure kernel',
                  status: overallStatus, // uses status from overall status so that we have action that match the status
                },
                {
                  name: 'configure_logging',
                  message: 'Successfully configured logging',
                  status: HostPolicyResponseActionStatus.success,
                },
                {
                  name: 'configure_malware',
                  message: 'Unexpected error configuring malware',
                  status: overallStatus, // uses status from overall status so that we have action that match the status
                },
                {
                  name: 'connect_kernel',
                  message: 'Successfully initialized minifilter',
                  status: HostPolicyResponseActionStatus.success,
                },
                {
                  name: 'detect_file_open_events',
                  message: 'Successfully stopped file open event reporting',
                  status: HostPolicyResponseActionStatus.success,
                },
                {
                  name: 'detect_file_write_events',
                  message: 'Failed to stop file write event reporting',
                  status: HostPolicyResponseActionStatus.success,
                },
                {
                  name: 'detect_image_load_events',
                  message: 'Successfully started image load event reporting',
                  status: HostPolicyResponseActionStatus.success,
                },
                {
                  name: 'detect_process_events',
                  message: 'Successfully started process event reporting',
                  status: HostPolicyResponseActionStatus.success,
                },
                {
                  name: 'download_global_artifacts',
                  message: 'Failed to download EXE model',
                  status: HostPolicyResponseActionStatus.success,
                },
                {
                  name: 'load_config',
                  message: 'Successfully parsed configuration',
                  status: HostPolicyResponseActionStatus.success,
                },
                {
                  name: 'load_malware_model',
                  message: 'Error deserializing EXE model; no valid malware model installed',
                  status: HostPolicyResponseActionStatus.success,
                },
                {
                  name: 'read_elasticsearch_config',
                  message: 'Successfully read Elasticsearch configuration',
                  status: HostPolicyResponseActionStatus.success,
                },
                {
                  name: 'read_events_config',
                  message: 'Successfully read events configuration',
                  status: HostPolicyResponseActionStatus.success,
                },
                {
                  name: 'read_kernel_config',
                  message: 'Succesfully read kernel configuration',
                  status: HostPolicyResponseActionStatus.success,
                },
                {
                  name: 'read_logging_config',
                  message: 'Field (logging.debugview) not found in config',
                  status: HostPolicyResponseActionStatus.success,
                },
                {
                  name: 'read_malware_config',
                  message: 'Successfully read malware detect configuration',
                  status: HostPolicyResponseActionStatus.success,
                },
                {
                  name: 'workflow',
                  message: 'Failed to apply a portion of the configuration (kernel)',
                  status: HostPolicyResponseActionStatus.unsupported,
                },
                {
                  name: 'download_model',
                  message: 'Failed to apply a portion of the configuration (kernel)',
                  status: HostPolicyResponseActionStatus.success,
                },
                {
                  name: 'ingest_events_config',
                  message: 'Failed to apply a portion of the configuration (kernel)',
                  status: HostPolicyResponseActionStatus.success,
                },
              ],
              id: this.seededUUIDv4(),
              response: {
                configurations: {
                  events: {
                    concerned_actions: ['download_model'],
                    status: HostPolicyResponseActionStatus.success,
                  },
                  logging: {
                    concerned_actions: this.randomHostPolicyResponseActionNames(),
                    status: HostPolicyResponseActionStatus.success,
                  },
                  malware: {
                    concerned_actions: ['configure_malware'], // this one here matches the overall status
                    status: overallStatus,
                  },
                  streaming: {
                    concerned_actions: this.randomHostPolicyResponseActionNames(),
                    status: HostPolicyResponseActionStatus.success,
                  },
                },
              },
              artifacts: {
                global: {
                  version: '1.4.0',
                  identifiers: [
                    {
                      name: 'endpointpe-model',
                      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                    },
                  ],
                },
                user: {
                  version: '1.4.0',
                  identifiers: [
                    {
                      name: 'user-model',
                      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                    },
                  ],
                },
              },
              status: overallStatus,
              version: 3,
              name: 'Protect the worlds information from attack',
              endpoint_policy_version: 2,
            },
          },
        },
        event: {
          created: ts,
          id: this.seededUUIDv4(),
          kind: 'state',
          category: ['host'],
          type: ['change'],
          module: 'endpoint',
          action: 'endpoint_policy_response',
          dataset: 'endpoint.policy',
        },
      },
      overrides
    );

    return policyResponse;
  }

  private randomHostPolicyResponseActionStatus(): HostPolicyResponseActionStatus {
    return this.randomChoice([
      HostPolicyResponseActionStatus.failure,
      HostPolicyResponseActionStatus.success,
      HostPolicyResponseActionStatus.warning,
      HostPolicyResponseActionStatus.unsupported,
    ]);
  }

  private randomHostPolicyResponseActionNames(): string[] {
    return this.randomArray(this.randomN(8), () =>
      this.randomChoice([
        'load_config',
        'workflow',
        'download_global_artifacts',
        'configure_malware',
        'read_malware_config',
        'load_malware_model',
        'read_kernel_config',
        'configure_kernel',
        'detect_process_events',
        'detect_file_write_events',
        'detect_file_open_events',
        'detect_image_load_events',
        'connect_kernel',
      ])
    );
  }
}
