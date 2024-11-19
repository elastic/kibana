/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getPolicyOptions } from './get_policy_options';
import { APIReturnType } from '../../services/rest/create_call_apm_api';

type APIResponseType = APIReturnType<'GET /internal/apm/fleet/agents'>;

const policyElasticAgentOnCloudAgent = {
  id: 'policy-elastic-agent-on-cloud',
  name: 'Elastic Cloud agent policy',
  apmServerUrl: 'apm_cloud_url',
  secretToken: 'apm_cloud_token',
};

const fleetAgents = [
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

describe('getPolicyOptions', () => {
  describe('running on cloud', () => {
    describe('with APM on cloud', () => {
      it('shows apm on cloud standalone option', () => {
        const data: APIResponseType = {
          fleetAgents: [],
          cloudStandaloneSetup: {
            apmServerUrl: 'cloud_url',
            secretToken: 'cloud_token',
          },
          isFleetEnabled: true,
        };
        const options = getPolicyOptions({
          isCloudEnabled: true,
          data,
        });
        expect(options).toEqual([
          {
            key: 'cloud',
            type: 'standalone',
            label: 'Default Standalone configuration',
            apmServerUrl: 'cloud_url',
            secretToken: 'cloud_token',
            isVisible: true,
            isSelected: true,
          },
        ]);
      });
      it('shows apm on cloud standalone option and fleet agents options', () => {
        const data: APIResponseType = {
          fleetAgents,
          cloudStandaloneSetup: {
            apmServerUrl: 'cloud_url',
            secretToken: 'cloud_token',
          },
          isFleetEnabled: true,
        };
        const options = getPolicyOptions({
          isCloudEnabled: true,
          data,
        });

        expect(options).toEqual([
          {
            key: 'cloud',
            type: 'standalone',
            label: 'Default Standalone configuration',
            apmServerUrl: 'cloud_url',
            secretToken: 'cloud_token',
            isVisible: true,
            isSelected: true,
          },

          {
            key: '1',
            type: 'fleetAgents',
            label: 'agent foo',
            apmServerUrl: 'foo',
            secretToken: 'foo',
            isVisible: true,
            isSelected: false,
          },
          {
            key: '2',
            type: 'fleetAgents',
            label: 'agent bar',
            apmServerUrl: 'bar',
            secretToken: 'bar',
            isVisible: true,
            isSelected: false,
          },
        ]);
      });
      it('selects policy elastic agent on cloud when available', () => {
        const data: APIResponseType = {
          fleetAgents: [policyElasticAgentOnCloudAgent, ...fleetAgents],
          cloudStandaloneSetup: {
            apmServerUrl: 'cloud_url',
            secretToken: 'cloud_token',
          },
          isFleetEnabled: true,
        };
        const options = getPolicyOptions({
          isCloudEnabled: true,
          data,
        });

        expect(options).toEqual([
          {
            key: 'policy-elastic-agent-on-cloud',
            type: 'fleetAgents',
            label: 'Elastic Cloud agent policy',
            apmServerUrl: 'apm_cloud_url',
            secretToken: 'apm_cloud_token',
            isVisible: true,
            isSelected: true,
          },
          {
            key: '1',
            type: 'fleetAgents',
            label: 'agent foo',
            apmServerUrl: 'foo',
            secretToken: 'foo',
            isVisible: true,
            isSelected: false,
          },
          {
            key: '2',
            type: 'fleetAgents',
            label: 'agent bar',
            apmServerUrl: 'bar',
            secretToken: 'bar',
            isVisible: true,
            isSelected: false,
          },
        ]);
      });
    });
    describe('with APM on prem', () => {
      it('shows apm on prem standalone option', () => {
        const data: APIResponseType = {
          fleetAgents: [],
          cloudStandaloneSetup: undefined,
          isFleetEnabled: true,
        };
        const options = getPolicyOptions({
          isCloudEnabled: true,
          data,
        });

        expect(options).toEqual([
          {
            key: 'onPrem',
            type: 'standalone',
            label: 'Default Standalone configuration',
            apmServerUrl: 'http://localhost:8200',
            secretToken: '',
            isVisible: true,
            isSelected: true,
          },
        ]);
      });
      it('shows apm on prem standalone option and fleet agents options', () => {
        const data: APIResponseType = {
          fleetAgents,
          cloudStandaloneSetup: undefined,
          isFleetEnabled: true,
        };
        const options = getPolicyOptions({
          isCloudEnabled: true,
          data,
        });
        expect(options).toEqual([
          {
            key: 'onPrem',
            type: 'standalone',
            label: 'Default Standalone configuration',
            apmServerUrl: 'http://localhost:8200',
            secretToken: '',
            isVisible: true,
            isSelected: true,
          },

          {
            key: '1',
            type: 'fleetAgents',
            label: 'agent foo',
            apmServerUrl: 'foo',
            secretToken: 'foo',
            isVisible: true,
            isSelected: false,
          },
          {
            key: '2',
            type: 'fleetAgents',
            label: 'agent bar',
            apmServerUrl: 'bar',
            secretToken: 'bar',
            isVisible: true,
            isSelected: false,
          },
        ]);
      });
      it('selects policy elastic agent on cloud when available', () => {
        const data: APIResponseType = {
          fleetAgents: [policyElasticAgentOnCloudAgent, ...fleetAgents],
          cloudStandaloneSetup: undefined,
          isFleetEnabled: true,
        };
        const options = getPolicyOptions({
          isCloudEnabled: true,
          data,
        });

        expect(options).toEqual([
          {
            key: 'policy-elastic-agent-on-cloud',
            type: 'fleetAgents',
            label: 'Elastic Cloud agent policy',
            apmServerUrl: 'apm_cloud_url',
            secretToken: 'apm_cloud_token',
            isVisible: true,
            isSelected: true,
          },
          {
            key: '1',
            type: 'fleetAgents',
            label: 'agent foo',
            apmServerUrl: 'foo',
            secretToken: 'foo',
            isVisible: true,
            isSelected: false,
          },
          {
            key: '2',
            type: 'fleetAgents',
            label: 'agent bar',
            apmServerUrl: 'bar',
            secretToken: 'bar',
            isVisible: true,
            isSelected: false,
          },
        ]);
      });
    });
  });
  describe('Running on prem', () => {
    it('shows apm on prem standalone option', () => {
      const data: APIResponseType = {
        fleetAgents: [],
        cloudStandaloneSetup: undefined,
        isFleetEnabled: true,
      };
      const options = getPolicyOptions({
        isCloudEnabled: false,
        data,
      });

      expect(options).toEqual([
        {
          key: 'onPrem',
          type: 'standalone',
          label: 'Default Standalone configuration',
          apmServerUrl: 'http://localhost:8200',
          secretToken: '',
          isVisible: true,
          isSelected: true,
        },
      ]);
    });
    it('shows apm on prem standalone option and fleet agents options', () => {
      const data: APIResponseType = {
        fleetAgents,
        cloudStandaloneSetup: undefined,
        isFleetEnabled: true,
      };
      const options = getPolicyOptions({
        isCloudEnabled: false,
        data,
      });

      expect(options).toEqual([
        {
          key: 'onPrem',
          type: 'standalone',
          label: 'Default Standalone configuration',
          apmServerUrl: 'http://localhost:8200',
          secretToken: '',
          isVisible: true,
          isSelected: true,
        },
        {
          key: '1',
          type: 'fleetAgents',
          label: 'agent foo',
          apmServerUrl: 'foo',
          secretToken: 'foo',
          isVisible: true,
          isSelected: false,
        },
        {
          key: '2',
          type: 'fleetAgents',
          label: 'agent bar',
          apmServerUrl: 'bar',
          secretToken: 'bar',
          isVisible: true,
          isSelected: false,
        },
      ]);
    });
  });
});
