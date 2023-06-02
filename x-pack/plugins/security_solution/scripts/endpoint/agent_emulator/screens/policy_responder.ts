/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepPartial } from '@kbn/utility-types';
import { grey } from 'chalk';
import { layout } from '../../common/screen/layout';
import { indexEndpointPolicyResponse } from '../../../../common/endpoint/data_loaders/index_endpoint_policy_response';
import { EndpointPolicyResponseGenerator } from '../../../../common/endpoint/data_generators/endpoint_policy_response_generator';
import type { HostInfo, HostPolicyResponse } from '../../../../common/endpoint/types';
import {
  fetchEndpointMetadataList,
  sendEndpointMetadataUpdate,
} from '../../common/endpoint_metadata_services';
import { TOOL_TITLE } from '../constants';
import type { DataFormatter } from '../../common/screen';
import { ChoiceMenuFormatter, ScreenBaseClass } from '../../common/screen';
import type { EmulatorRunContext } from '../services/emulator_run_context';
import { HostPolicyResponseActionStatus } from '../../../../common/endpoint/types';

const policyResponseGenerator = new EndpointPolicyResponseGenerator();

const macOsSysExtTypeLabel = 'macOS System Ext. Failure';

const policyResponseStatusesTypes: Readonly<
  Record<string, HostPolicyResponseActionStatus | undefined>
> = Object.freeze({
  Success: HostPolicyResponseActionStatus.success,
  Failure: HostPolicyResponseActionStatus.failure,
  Warning: HostPolicyResponseActionStatus.warning,
  Random: undefined,
  [macOsSysExtTypeLabel]: HostPolicyResponseActionStatus.failure,
});

interface PolicyResponseOptions {
  agentId: string;
  hostMetadata: HostInfo;
  responseType: string;
}

export class PolicyResponderScreen extends ScreenBaseClass {
  private choices: ChoiceMenuFormatter = new ChoiceMenuFormatter(
    [
      {
        title: 'Setup',
        key: '1',
      },
      {
        title: 'Send',
        key: '2',
      },
    ],
    { layout: 'horizontal' }
  );

  private options: PolicyResponseOptions | undefined = undefined;

  constructor(private readonly emulatorContext: EmulatorRunContext) {
    super();
  }

  protected header() {
    return super.header(TOOL_TITLE, 'Policy Responder');
  }

  protected body(): string | DataFormatter {
    const selectedHost = this.options?.hostMetadata
      ? this.options.hostMetadata.metadata.host.hostname
      : grey('None configured');
    const responseType = this.options?.responseType
      ? this.options.responseType
      : grey('None configured');

    return layout`Send a policy response for a given Endpoint host.

  Selected Host: ${selectedHost}
  Response Type: ${responseType}

Options:
${this.choices}
`;
  }

  protected onEnterChoice(choice: string) {
    const choiceValue = choice.trim().toUpperCase();

    switch (choiceValue) {
      case '1':
        this.configView();
        break;

      case '2':
        this.sendPolicyResponse();
        break;

      default:
        super.onEnterChoice(choice);
    }
  }

  private async configView() {
    let hostMetadata: HostInfo | undefined;

    const userChoices = await this.prompt<Pick<PolicyResponseOptions, 'agentId' | 'responseType'>>({
      questions: [
        {
          type: 'input',
          name: 'agentId',
          message: 'Agent id or host name: ',
          validate: async (input: string): Promise<boolean | string> => {
            const agentValue = input.trim();

            if (!agentValue) {
              return 'Value is required';
            }

            const { data } = await fetchEndpointMetadataList(this.emulatorContext.getKbnClient(), {
              kuery: `united.endpoint.agent.id:  "${input}" or united.endpoint.host.hostname: "${input}"`,
              pageSize: 1,
            });

            hostMetadata = data[0];

            if (!hostMetadata) {
              return `Endpoint "${input}" not found!`;
            }

            return true;
          },
        },
        {
          type: 'list',
          name: 'responseType',
          message: 'Policy response type: ',
          choices: Object.keys(policyResponseStatusesTypes),
          default: 'Success',
        },
      ],
    });

    if (hostMetadata) {
      this.options = {
        ...userChoices,
        hostMetadata,
      };

      const runNow = await this.prompt<{ confirm: boolean }>({
        questions: [
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Send it? ',
            default: 'y',
          },
        ],
      });

      if (runNow.confirm) {
        this.onEnterChoice('2');
        return;
      }
    }

    this.reRender();
  }

  private async sendPolicyResponse() {
    if (!this.options || !this.options.hostMetadata) {
      this.reRender();
      this.showMessage('No host configured!', 'red');
      return;
    }

    this.showMessage('Sending policy response...');

    const esClient = this.emulatorContext.getEsClient();
    const { responseType, hostMetadata } = this.options;
    const lastAppliedPolicy = hostMetadata.metadata.Endpoint.policy.applied;
    const overallStatus: HostPolicyResponseActionStatus | undefined =
      policyResponseStatusesTypes[responseType];

    const policyApplied: Partial<HostInfo['metadata']['Endpoint']['policy']['applied']> = {
      ...(overallStatus ? { status: overallStatus } : {}),
      name: lastAppliedPolicy.name,
      endpoint_policy_version: lastAppliedPolicy.endpoint_policy_version,
      id: lastAppliedPolicy.id,
      version: lastAppliedPolicy.version,
    };

    const policyResponseOverrides: DeepPartial<HostPolicyResponse> = {
      agent: hostMetadata.metadata.agent,
      Endpoint: {
        policy: {
          applied: policyApplied,
        },
      },
    };

    const policyResponse =
      responseType === macOsSysExtTypeLabel
        ? policyResponseGenerator.generateConnectKernelFailure(policyResponseOverrides)
        : policyResponseGenerator.generate(policyResponseOverrides);

    // Create policy response and update the host's metadata.
    await indexEndpointPolicyResponse(esClient, policyResponse);
    await sendEndpointMetadataUpdate(esClient, hostMetadata.metadata.agent.id, {
      Endpoint: {
        policy: {
          applied: policyApplied,
        },
      },
    });

    this.reRender();
    this.showMessage('Successful', 'green', true);
  }
}
