/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Story } from '@storybook/react';
import { HttpStart } from 'kibana/public';
import React from 'react';
import { POLICY_ELASTIC_AGENT_ON_CLOUD } from '../../../common/fleet';
import TutorialConfigAgent from './';
import { APIReturnType } from '../../services/rest/create_call_apm_api';

export type APIResponseType = APIReturnType<'GET /internal/apm/fleet/agents'>;

interface Args {
  apmAgent: string;
  onPrem: boolean;
  hasFleetPoliciesWithApmIntegration: boolean;
  hasCloudPolicyWithApmIntegration: boolean;
  isFleetEnabled: boolean;
}

const policyElasticAgentOnCloudAgent: APIResponseType['fleetAgents'][0] = {
  id: POLICY_ELASTIC_AGENT_ON_CLOUD,
  name: 'Elastic Cloud agent policy',
  apmServerUrl: 'apm_cloud_url',
  secretToken: 'apm_cloud_token',
};

const fleetAgents: APIResponseType['fleetAgents'] = [
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
  hasFleetPoliciesWithApmIntegration,
  apmAgent,
  onPrem,
  hasCloudPolicyWithApmIntegration,
  isFleetEnabled,
}: Args) {
  const http = {
    get: () => ({
      fleetAgents: [
        ...(hasFleetPoliciesWithApmIntegration ? fleetAgents : []),
        ...(hasCloudPolicyWithApmIntegration
          ? [policyElasticAgentOnCloudAgent]
          : []),
      ],
      isFleetEnabled,
      cloudStandaloneSetup: {
        apmServerUrl: 'cloud_url',
        secretToken: 'foo',
      },
    }),
  } as unknown as HttpStart;
  return (
    <TutorialConfigAgent
      http={http}
      basePath="http://localhost:5601"
      isCloudEnabled={!onPrem}
      variantId={apmAgent}
      kibanaVersion="8.0.0"
    />
  );
}
export const Integration: Story<Args> = (args) => {
  return <Wrapper {...args} />;
};

Integration.args = {
  apmAgent: 'java',
  onPrem: true,
  hasFleetPoliciesWithApmIntegration: false,
  hasCloudPolicyWithApmIntegration: false,
  isFleetEnabled: true,
};

export default {
  title: 'app/Tutorial/AgentConfig',
  component: TutorialConfigAgent,
  argTypes: {
    apmAgent: {
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
    onPrem: {
      control: { type: 'boolean', options: [true, false] },
    },
    hasFleetPoliciesWithApmIntegration: {
      control: { type: 'boolean', options: [true, false] },
    },
    hasCloudPolicyWithApmIntegration: {
      control: { type: 'boolean', options: [true, false] },
    },
    isFleetEnabled: {
      control: { type: 'boolean', options: [true, false], defaultValue: true },
    },
  },
};
