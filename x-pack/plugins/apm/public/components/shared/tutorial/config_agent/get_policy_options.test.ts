/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getPolicyOptions } from './get_policy_options';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';

type APIResponseType = APIReturnType<'GET /api/apm/fleet/agents'>;

const policyElasticAgentOnCloudAgent = {
  id: 'policy-elastic-agent-on-cloud',
  name: 'Elastic Cloud agent policy',
  apmServerUrl: 'apm_cloud_url',
  secretToken: 'apm_cloud_token',
};

const agents = [
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
          agents: [],
          cloudStandaloneSetup: {
            apmServerUrl: 'cloud_url',
            secretToken: 'cloud_token',
          },
        };
        const { availableOptions, defaultSelectedOption } = getPolicyOptions({
          isCloudEnabled: true,
          data,
        });
        expect(defaultSelectedOption).toEqual({
          key: 'cloud_standalone',
          label: 'Default Standalone configuration',
          apmServerUrl: 'cloud_url',
          secretToken: 'cloud_token',
        });
        expect(availableOptions).toEqual([
          {
            key: 'cloud_standalone',
            label: 'Default Standalone configuration',
            apmServerUrl: 'cloud_url',
            secretToken: 'cloud_token',
          },
        ]);
      });
      it('shows apm on cloud standalone option and fleet agents options', () => {
        const data: APIResponseType = {
          agents,
          cloudStandaloneSetup: {
            apmServerUrl: 'cloud_url',
            secretToken: 'cloud_token',
          },
        };
        const { availableOptions, defaultSelectedOption } = getPolicyOptions({
          isCloudEnabled: true,
          data,
        });
        expect(defaultSelectedOption).toEqual({
          key: 'cloud_standalone',
          label: 'Default Standalone configuration',
          apmServerUrl: 'cloud_url',
          secretToken: 'cloud_token',
        });
        expect(availableOptions).toEqual([
          {
            key: 'cloud_standalone',
            label: 'Default Standalone configuration',
            apmServerUrl: 'cloud_url',
            secretToken: 'cloud_token',
          },
          {
            label: 'Fleet policies',
            options: [
              {
                key: '1',
                label: 'agent foo',
                apmServerUrl: 'foo',
                secretToken: 'foo',
              },
              {
                key: '2',
                label: 'agent bar',
                apmServerUrl: 'bar',
                secretToken: 'bar',
              },
            ],
          },
        ]);
      });
      it('selects policy elastic agent on cloud when available', () => {
        const data: APIResponseType = {
          agents: [policyElasticAgentOnCloudAgent, ...agents],
          cloudStandaloneSetup: {
            apmServerUrl: 'cloud_url',
            secretToken: 'cloud_token',
          },
        };
        const { availableOptions, defaultSelectedOption } = getPolicyOptions({
          isCloudEnabled: true,
          data,
        });
        expect(defaultSelectedOption).toEqual({
          key: 'policy-elastic-agent-on-cloud',
          label: 'Elastic Cloud agent policy',
          apmServerUrl: 'apm_cloud_url',
          secretToken: 'apm_cloud_token',
        });
        expect(availableOptions).toEqual([
          {
            key: 'cloud_standalone',
            label: 'Default Standalone configuration',
            apmServerUrl: 'cloud_url',
            secretToken: 'cloud_token',
          },
          {
            label: 'Fleet policies',
            options: [
              {
                key: 'policy-elastic-agent-on-cloud',
                label: 'Elastic Cloud agent policy',
                apmServerUrl: 'apm_cloud_url',
                secretToken: 'apm_cloud_token',
              },
              {
                key: '1',
                label: 'agent foo',
                apmServerUrl: 'foo',
                secretToken: 'foo',
              },
              {
                key: '2',
                label: 'agent bar',
                apmServerUrl: 'bar',
                secretToken: 'bar',
              },
            ],
          },
        ]);
      });
    });
    describe('with APM on prem', () => {
      it('shows apm on prem standalone option', () => {
        const data: APIResponseType = {
          agents: [],
          cloudStandaloneSetup: undefined,
        };
        const { availableOptions, defaultSelectedOption } = getPolicyOptions({
          isCloudEnabled: true,
          data,
        });
        expect(defaultSelectedOption).toEqual({
          key: 'onPrem_standalone',
          label: 'Default Standalone configuration',
          apmServerUrl: 'http://localhost:8200',
          secretToken: '',
        });
        expect(availableOptions).toEqual([
          {
            key: 'onPrem_standalone',
            label: 'Default Standalone configuration',
            apmServerUrl: 'http://localhost:8200',
            secretToken: '',
          },
        ]);
      });
      it('shows apm on prem standalone option and fleet agents options', () => {
        const data: APIResponseType = {
          agents,
          cloudStandaloneSetup: undefined,
        };
        const { availableOptions, defaultSelectedOption } = getPolicyOptions({
          isCloudEnabled: true,
          data,
        });
        expect(defaultSelectedOption).toEqual({
          key: 'onPrem_standalone',
          label: 'Default Standalone configuration',
          apmServerUrl: 'http://localhost:8200',
          secretToken: '',
        });
        expect(availableOptions).toEqual([
          {
            key: 'onPrem_standalone',
            label: 'Default Standalone configuration',
            apmServerUrl: 'http://localhost:8200',
            secretToken: '',
          },
          {
            label: 'Fleet policies',
            options: [
              {
                key: '1',
                label: 'agent foo',
                apmServerUrl: 'foo',
                secretToken: 'foo',
              },
              {
                key: '2',
                label: 'agent bar',
                apmServerUrl: 'bar',
                secretToken: 'bar',
              },
            ],
          },
        ]);
      });
      it('selects policy elastic agent on cloud when available', () => {
        const data: APIResponseType = {
          agents: [policyElasticAgentOnCloudAgent, ...agents],
          cloudStandaloneSetup: undefined,
        };
        const { availableOptions, defaultSelectedOption } = getPolicyOptions({
          isCloudEnabled: true,
          data,
        });
        expect(defaultSelectedOption).toEqual({
          key: 'policy-elastic-agent-on-cloud',
          label: 'Elastic Cloud agent policy',
          apmServerUrl: 'apm_cloud_url',
          secretToken: 'apm_cloud_token',
        });
        expect(availableOptions).toEqual([
          {
            key: 'onPrem_standalone',
            label: 'Default Standalone configuration',
            apmServerUrl: 'http://localhost:8200',
            secretToken: '',
            checked: undefined,
          },
          {
            label: 'Fleet policies',
            options: [
              {
                key: 'policy-elastic-agent-on-cloud',
                label: 'Elastic Cloud agent policy',
                apmServerUrl: 'apm_cloud_url',
                secretToken: 'apm_cloud_token',
              },
              {
                key: '1',
                label: 'agent foo',
                apmServerUrl: 'foo',
                secretToken: 'foo',
              },
              {
                key: '2',
                label: 'agent bar',
                apmServerUrl: 'bar',
                secretToken: 'bar',
              },
            ],
          },
        ]);
      });
    });
  });
  describe('Running on prem', () => {
    it('shows apm on prem standalone option', () => {
      const data: APIResponseType = {
        agents: [],
        cloudStandaloneSetup: undefined,
      };
      const { availableOptions, defaultSelectedOption } = getPolicyOptions({
        isCloudEnabled: false,
        data,
      });
      expect(defaultSelectedOption).toEqual({
        key: 'onPrem_standalone',
        label: 'Default Standalone configuration',
        apmServerUrl: 'http://localhost:8200',
        secretToken: '',
      });
      expect(availableOptions).toEqual([
        {
          key: 'onPrem_standalone',
          label: 'Default Standalone configuration',
          apmServerUrl: 'http://localhost:8200',
          secretToken: '',
        },
      ]);
    });
    it('shows apm on prem standalone option and fleet agents options', () => {
      const data: APIResponseType = {
        agents,
        cloudStandaloneSetup: undefined,
      };
      const { availableOptions, defaultSelectedOption } = getPolicyOptions({
        isCloudEnabled: false,
        data,
      });
      expect(defaultSelectedOption).toEqual({
        key: 'onPrem_standalone',
        label: 'Default Standalone configuration',
        apmServerUrl: 'http://localhost:8200',
        secretToken: '',
      });
      expect(availableOptions).toEqual([
        {
          key: 'onPrem_standalone',
          label: 'Default Standalone configuration',
          apmServerUrl: 'http://localhost:8200',
          secretToken: '',
        },
        {
          label: 'Fleet policies',
          options: [
            {
              key: '1',
              label: 'agent foo',
              apmServerUrl: 'foo',
              secretToken: 'foo',
            },
            {
              key: '2',
              label: 'agent bar',
              apmServerUrl: 'bar',
              secretToken: 'bar',
            },
          ],
        },
      ]);
    });
  });
});
