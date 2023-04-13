/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepPartial } from '@kbn/utility-types';
import { mergeWith } from 'lodash';
import { BaseDataGenerator } from './base_data_generator';
import type { HostPolicyResponse, HostPolicyResponseAppliedAction } from '../types';
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

    // Keep track of used action key'd by their `name`
    const usedActions: Record<string, HostPolicyResponseAppliedAction> = {};
    const generateActionNames = (): string[] => {
      // At least 3, but no more than 15
      const actions = this.randomActionList(Math.max(3, this.randomN(15)));

      return actions.map((action) => {
        const actionName = action.name;

        // If action is not yet in the list, add it
        if (!usedActions[actionName]) {
          usedActions[actionName] = action;
        }

        return actionName;
      });
    };

    const policyResponse: HostPolicyResponse = {
      data_stream: {
        type: 'metrics',
        dataset: 'endpoint.policy',
        namespace: 'default',
      },
      '@timestamp': ts,
      agent: {
        id: agentVersion,
        version: '8.8.0',
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
            id: this.seededUUIDv4(),
            status: overallStatus,
            version: 3,
            name: 'Protect the worlds information from attack',
            endpoint_policy_version: 2,
            actions: [], // populated down below
            response: {
              configurations: {
                events: {
                  concerned_actions: generateActionNames(),
                  status: HostPolicyResponseActionStatus.success,
                },
                logging: {
                  concerned_actions: generateActionNames(),
                  status: HostPolicyResponseActionStatus.success,
                },
                malware: {
                  concerned_actions: generateActionNames(),
                  status: HostPolicyResponseActionStatus.success,
                },
                streaming: {
                  concerned_actions: generateActionNames(),
                  status: HostPolicyResponseActionStatus.success,
                },
                behavior_protection: {
                  concerned_actions: generateActionNames(),
                  status: HostPolicyResponseActionStatus.success,
                },
                attack_surface_reduction: {
                  concerned_actions: generateActionNames(),
                  status: HostPolicyResponseActionStatus.success,
                },
                antivirus_registration: {
                  concerned_actions: generateActionNames(),
                  status: HostPolicyResponseActionStatus.success,
                },
                host_isolation: {
                  concerned_actions: generateActionNames(),
                  status: HostPolicyResponseActionStatus.success,
                },
                response_actions: {
                  concerned_actions: generateActionNames(),
                  status: HostPolicyResponseActionStatus.success,
                },
                ransomware: {
                  concerned_actions: generateActionNames(),
                  status: HostPolicyResponseActionStatus.success,
                },
                memory_protection: {
                  concerned_actions: generateActionNames(),
                  status: HostPolicyResponseActionStatus.success,
                },
              },
              diagnostic: {
                behavior_protection: {
                  concerned_actions: generateActionNames(),
                  status: HostPolicyResponseActionStatus.success,
                },
                malware: {
                  concerned_actions: generateActionNames(),
                  status: HostPolicyResponseActionStatus.success,
                },
                ransomware: {
                  concerned_actions: generateActionNames(),
                  status: HostPolicyResponseActionStatus.success,
                },
                memory_protection: {
                  concerned_actions: generateActionNames(),
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
    };

    policyResponse.Endpoint.policy.applied.actions = Object.values(usedActions);

    if (overallStatus !== HostPolicyResponseActionStatus.success) {
      const appliedPolicy = policyResponse.Endpoint.policy.applied;

      appliedPolicy.status = overallStatus;

      // set one of the configs responses to also be the same as overall status
      const config = this.randomChoice(Object.values(appliedPolicy.response.configurations));
      config.status = overallStatus;

      // ensure at least one of the action for this config. has the same status
      const actionName = this.randomChoice(config.concerned_actions);
      usedActions[actionName].status = overallStatus;
      usedActions[actionName].message = `Failed. ${usedActions[actionName].message.replace(
        /successfully /i,
        ''
      )}`;
    }

    return mergeAndReplaceArrays(policyResponse, overrides);
  }

  private randomHostPolicyResponseActionStatus(): HostPolicyResponseActionStatus {
    return this.randomChoice([
      HostPolicyResponseActionStatus.failure,
      HostPolicyResponseActionStatus.success,
      HostPolicyResponseActionStatus.warning,
      HostPolicyResponseActionStatus.unsupported,
    ]);
  }

  private randomActionList(count: number = 5): HostPolicyResponseAppliedAction[] {
    const usedAction: Record<string, boolean> = {};

    return Array.from({ length: count }, () => {
      let tries = 10; // Number of times we try to get a unique action
      let action: undefined | HostPolicyResponseAppliedAction;

      while (!action || tries > 0) {
        --tries;
        action = this.randomAction();

        if (!usedAction[action.name]) {
          usedAction[action.name] = true;
          return action;
        }

        // try again. action has already been used
        action = undefined;
      }

      // Last effort to ensure we do return an action
      return action ?? this.randomAction();
    });
  }

  private randomAction(status?: HostPolicyResponseActionStatus): HostPolicyResponseAppliedAction {
    const action = this.randomChoice<HostPolicyResponseAppliedAction>([
      {
        name: 'configure_antivirus_registration',
        message: 'Antivirus registration is not possible on servers',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_ransomware',
        message: 'Successfully enabled ransomware prevention with mbr enabled and canaries enabled',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_credential_hardening',
        message: 'Successfully read credential protection configuration',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_memory_threat',
        message:
          'Successfully enabled memory threat prevention with memory scanning enabled and shellcode protection enabled including trampoline monitoring',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_diagnostic_memory_threat',
        message: 'Successfully disabled memory threat protection',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_host_isolation',
        message: 'Host is not isolated',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_malicious_behavior',
        message: 'Enabled 313 out of 313 malicious behavior rules',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_diagnostic_malicious_behavior',
        message: 'Diagnostic rules not enabled',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_user_notification',
        message: 'Successfully configured user notification',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_malware',
        message: 'Successfully enabled malware prevention',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_diagnostic_malware',
        message: 'Successfully disabled malware protection',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_diagnostic_rollback',
        message: 'Diagnostic rollback is disabled',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_rollback',
        message: 'Rollback is disabled',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_kernel',
        message: 'Successfully configured kernel',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_output',
        message: 'Successfully configured output connection',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_alerts',
        message: 'Successfully configured alerts',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_logging',
        message: 'Successfully configured logging',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'load_config',
        message: 'Successfully parsed configuration',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'download_user_artifacts',
        message: 'Successfully downloaded user artifacts',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'download_global_artifacts',
        message: 'Global artifacts are available for use',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'connect_kernel',
        message: 'Successfully connected to kernel minifilter component',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'detect_process_events',
        message: 'Successfully started process event reporting',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'detect_sync_image_load_events',
        message: 'Successfully started sync image load event reporting',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'detect_async_image_load_events',
        message: 'Successfully started async image load event reporting',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'detect_file_write_events',
        message: 'Successfully started file write event reporting',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'detect_file_open_events',
        message: 'Successfully stopped file open event reporting',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'detect_network_events',
        message: 'Successfully started network event reporting',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'detect_registry_events',
        message: 'Successfully started registry event reporting',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'detect_thread_events',
        message: 'Successfully configured thread events',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'detect_file_access_events',
        message: 'Successfully configured file access event reporting',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'detect_registry_access_events',
        message: 'Successfully configured registry access event reporting',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'detect_process_handle_events',
        message: 'Successfully started process handle event reporting',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_callstacks',
        message: 'Successfully configured callstacks',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_file_events',
        message: 'Success enabling file events; current state is enabled',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_network_events',
        message: 'Success enabling network events; current state is enabled',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_process_events',
        message: 'Success enabling process events; current state is enabled',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_imageload_events',
        message:
          'Success enabling image load events; current state is enabled Source configuration changed.',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_dns_events',
        message: 'Success enabling dns events; current state is enabled',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_registry_events',
        message: 'Success enabling registry events; current state is enabled',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_security_events',
        message: 'Success enabling security events; current state is enabled',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_threat_intelligence_api_events',
        message: 'Success disabling injection api events; current state is disabled',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_diagnostic_ransomware',
        message: 'Successfully disabled ransomware protection',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'configure_response_actions',
        message: 'Successfully configured fleet API for response actions',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'agent_connectivity',
        message: 'Failed to connect to Agent',
        status: HostPolicyResponseActionStatus.success,
      },
      {
        name: 'workflow',
        message: 'Successfully executed all workflows',
        status: HostPolicyResponseActionStatus.success,
      },
    ]);

    if (status) {
      action.status = status;
    }

    return action;
  }

  /**
   * Generates a Policy Response for `connect_kernel`, which is a typical error on MacOS when
   * no system extension failure
   */
  generateConnectKernelFailure(
    overrides: DeepPartial<HostPolicyResponse> = {}
  ): HostPolicyResponse {
    const policyResponse = this.generate(
      mergeAndReplaceArrays(
        {
          // using `success` below for status only so that we don't get back any other errors
          Endpoint: { policy: { applied: { status: HostPolicyResponseActionStatus.success } } },
        },
        overrides
      )
    );

    const appliedPolicy = policyResponse.Endpoint.policy.applied;
    const actionMessage = 'Failed to connected to kernel minifilter component';

    appliedPolicy.status = HostPolicyResponseActionStatus.failure;

    // Adjust connect_kernel action to represent a Macos system extension failure
    const connectKernelAction = appliedPolicy.actions.find(
      (action) => action.name === 'connect_kernel'
    ) ?? {
      name: 'connect_kernel',
      message: actionMessage,
      status: HostPolicyResponseActionStatus.failure,
    };
    const needsToBeAdded = connectKernelAction.message === '';

    if (needsToBeAdded) {
      appliedPolicy.actions.push(connectKernelAction);
      appliedPolicy.response.configurations.malware.concerned_actions.push(
        connectKernelAction.name
      );
      appliedPolicy.response.configurations.malware.status = HostPolicyResponseActionStatus.failure;
    } else {
      connectKernelAction.message = actionMessage;
      connectKernelAction.status = HostPolicyResponseActionStatus.failure;

      // Find every response config with this action and set it to failure
      Object.values(appliedPolicy.response.configurations).forEach((responseConfig) => {
        if (responseConfig.concerned_actions.includes(connectKernelAction.name)) {
          responseConfig.status = HostPolicyResponseActionStatus.failure;
        }
      });
    }

    return policyResponse;
  }
}
