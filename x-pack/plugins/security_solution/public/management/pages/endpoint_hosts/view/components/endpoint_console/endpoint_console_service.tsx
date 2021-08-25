/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';

import { EuiDescriptionList } from '@elastic/eui';
import { EuiDescriptionListProps } from '@elastic/eui/src/components/description_list/description_list';
import styled from 'styled-components';
import {
  ConsoleServiceInterface,
  CommandDefinition,
  Command,
} from '../../../../../components/console';
import { GetHostPolicyResponse, HostMetadata } from '../../../../../../../common/endpoint/types';
import { KibanaServices } from '../../../../../../common/lib/kibana';
import { BASE_POLICY_RESPONSE_ROUTE } from '../../../../../../../common/endpoint/constants';

const EuiDescriptionListStyled = styled(EuiDescriptionList)`
  &.euiDescriptionList {
    > .euiDescriptionList__title.title {
      width: 15ch;
      color: ${({ theme }) => theme.eui.euiCodeBlockSectionColor};
    }

    > .euiDescriptionList__description.description {
      width: calc(97% - 15ch);
    }

    > .euiDescriptionList__title.title,
    > .euiDescriptionList__description.description {
      margin-top: ${({ theme }) => theme.eui.paddingSizes.xs};
    }

    > .euiDescriptionList__title.title:first-child,
    > .euiDescriptionList__description.description:first-child {
      margin-top: 0;
    }
  }
`;

export class EndpointConsoleService implements ConsoleServiceInterface {
  constructor(private readonly endpoint: HostMetadata) {}

  getCommandList(): CommandDefinition[] {
    return [
      {
        name: 'about',
        about: 'Endpoint information',
        args: undefined,
      },
      {
        name: 'isolate',
        about: 'Isolate the host',
        args: undefined,
      },
      {
        name: 'release',
        about: 'Release a host from its network isolation state',
        args: undefined,
      },
    ];
  }

  async executeCommand(command: Command): Promise<{ result: ReactNode }> {
    if (command.commandDefinition.name === 'about') {
      return { result: await this.getAboutInfo() };
    }

    await new Promise((r) => setTimeout(r, 4000));

    return {
      result: <div>{'command executed successful'}</div>,
    };
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
      if (policyResponse.agent.build) {
        aboutInfo.push({
          title: 'Build',
          description: policyResponse.agent.build.original,
        });
      }

      aboutInfo.push(
        {
          title: 'artifacts.global',
          description: (
            <EuiDescriptionListStyled
              compressed
              type="column"
              listItems={policyResponse.Endpoint.policy.applied.artifacts.global.identifiers.map(
                ({ name, sha256 }) => ({ title: name, description: sha256 })
              )}
              titleProps={{
                className: 'eui-textTruncate title',
              }}
              descriptionProps={{
                className: 'description',
              }}
            />
          ),
        },
        {
          title: 'artifacts.user',
          description: (
            <EuiDescriptionListStyled
              compressed
              type="column"
              listItems={policyResponse.Endpoint.policy.applied.artifacts.user.identifiers.map(
                ({ name, sha256 }) => ({ title: name, description: sha256 })
              )}
              titleProps={{
                className: 'eui-textTruncate title',
              }}
              descriptionProps={{
                className: 'description',
              }}
            />
          ),
        }
      );
    }

    return (
      <EuiDescriptionListStyled
        type="column"
        listItems={aboutInfo}
        compressed={true}
        titleProps={{
          className: 'eui-textTruncate title',
        }}
        descriptionProps={{
          className: 'description',
        }}
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
