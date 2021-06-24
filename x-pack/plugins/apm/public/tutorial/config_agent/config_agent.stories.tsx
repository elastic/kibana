/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/function-component-definition */

import { Story } from '@storybook/react';
import { HttpStart } from 'kibana/public';
import React from 'react';
import TutorialConfigAgent from './';
import { APIReturnType } from '../..//services/rest/createCallApmApi';

export type APIResponseType = APIReturnType<'GET /api/apm/fleet/agents'>;

interface Args {
  variantId: string;
  environment: 'cloud' | 'onprem';
  addAgents: boolean;
  addPolicyOnCloudAgent: boolean;
}

const policyElasticAgentOnCloudAgent: APIResponseType['agents'][0] = {
  id: 'policy-elastic-agent-on-cloud',
  name: 'Elastic Cloud agent policy',
  apmServerUrl: 'apm_cloud_url',
  secretToken: 'apm_cloud_token',
};

const _agents: APIResponseType['agents'] = [
  {
    id: '1',
    name: 'agent foo',
    apmServerUrl: 'foo',
    secretToken: 'foo',
  },
  {
    id: '2',
    name: 'agent bar',
    apmServerUrl: 'bar',
    secretToken: 'bar',
  },
];

function Wrapper({
  addAgents,
  variantId,
  environment,
  addPolicyOnCloudAgent,
}: Args) {
  const http = ({
    get: () => ({
      agents: [
        ...(addAgents ? _agents : []),
        ...(addPolicyOnCloudAgent ? [policyElasticAgentOnCloudAgent] : []),
      ],
      cloudStandaloneSetup: {
        apmServerUrl: 'cloud_url',
        secretToken: 'foo',
      },
    }),
  } as unknown) as HttpStart;
  return (
    <TutorialConfigAgent
      http={http}
      basePath="http://localhost:5601"
      isCloudEnabled={environment === 'cloud'}
      variantId={variantId}
    />
  );
}
export const Integration: Story<Args> = (_args) => {
  return <Wrapper {..._args} />;
};

Integration.args = {
  variantId: 'java',
  environment: 'onprem',
  addAgents: false,
  addPolicyOnCloudAgent: false,
};

export default {
  title: 'app/Tutorial/AgentConfig',
  component: TutorialConfigAgent,
  argTypes: {
    variantId: {
      control: {
        type: 'select',
        options: [
          'java',
          'node',
          'django',
          'flask',
          'rails',
          'rack',
          'go',
          'dotnet',
          'php',
          'js',
          'js_script',
        ],
      },
    },
    environment: {
      control: { type: 'select', options: ['onprem', 'cloud'] },
    },
    addAgents: {
      control: { type: 'inline-radio', options: [true, false] },
    },
    addPolicyOnCloudAgent: {
      control: { type: 'inline-radio', options: [true, false] },
    },
  },
};
