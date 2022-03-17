/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';

import { EuiDescriptionList } from '@elastic/eui';
import { EuiDescriptionListProps } from '@elastic/eui/src/components/description_list/description_list';
import { CommandServiceInterface, CommandDefinition, Command } from '../console';
import { GetHostPolicyResponse, HostMetadata } from '../../../../common/endpoint/types';
import { KibanaServices } from '../../../common/lib/kibana';
import { BASE_POLICY_RESPONSE_ROUTE } from '../../../../common/endpoint/constants';

export class EndpointConsoleCommandService implements CommandServiceInterface {
  constructor(private readonly endpoint: HostMetadata) {}

  getCommandList(): CommandDefinition[] {
    return [
      // {
      //   name: 'about',
      //   about: 'Endpoint information',
      //   args: undefined,
      // },
    ];
  }

  async executeCommand(command: Command): Promise<{ result: ReactNode }> {
    switch (command.commandDefinition.name) {
      case 'about':
        return { result: await this.getAboutInfo() };
      default:
        return { result: <></> };
    }
  }

  private async getAboutInfo(): Promise<ReactNode> {
    const aboutInfo: EuiDescriptionListProps['listItems'] = [];

    aboutInfo.push(
      ...Object.entries(this.endpoint.agent).map(([title, description]) => ({
        title,
        description,
      })),
      ...Object.entries(this.endpoint.host.os).map(([title, _description]) => {
        return {
          title: `os.${title}`,
          description:
            'string' !== typeof _description ? JSON.stringify(_description) : _description,
        };
      }),
      {
        title: 'Isolated',
        description: this.endpoint.Endpoint.state?.isolation ? 'Yes' : 'No',
      }
    );

    const policyResponse = (await this.fetchPolicyResponse()).policy_response;

    if (policyResponse) {
      // @ts-ignore
      if (policyResponse.agent.build) {
        aboutInfo.push({
          title: 'Build',
          // @ts-ignore
          description: policyResponse.agent.build.original,
        });
      }

      aboutInfo.push(
        {
          title: 'artifacts.global',
          description: (
            <EuiDescriptionList
              compressed
              type="column"
              listItems={policyResponse.Endpoint.policy.applied.artifacts.global.identifiers.map(
                ({ name, sha256 }) => ({ title: name, description: sha256 })
              )}
            />
          ),
        },
        {
          title: 'artifacts.user',
          description: (
            <EuiDescriptionList
              compressed
              type="column"
              listItems={policyResponse.Endpoint.policy.applied.artifacts.user.identifiers.map(
                ({ name, sha256 }) => ({ title: name, description: sha256 })
              )}
            />
          ),
        }
      );
    }

    return (
      <EuiDescriptionList
        type="column"
        className="descriptionList-20_80"
        listItems={aboutInfo}
        compressed={true}
      />
    );
  }

  private async fetchPolicyResponse(): Promise<GetHostPolicyResponse> {
    return KibanaServices.get().http.get(BASE_POLICY_RESPONSE_ROUTE, {
      query: {
        agentId: this.endpoint.agent.id,
      },
    });
  }
}
