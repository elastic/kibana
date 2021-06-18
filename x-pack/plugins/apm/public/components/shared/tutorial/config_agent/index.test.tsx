/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getEnvironmentConfigurationOptions } from './';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';

type APIResponseType = APIReturnType<'GET /api/apm/fleet/agents'>;

const policyElasticAgentOnCloud = {
  id: '3',
  name: 'policy-elastic-agent-on-cloud',
  apmServerUrl: 'baz',
  secretToken: 'baz',
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

describe('Tutorial config agent', () => {
  describe('getEnvironmentConfigurationOptions', () => {
    describe('running on cloud', () => {
      describe('with APM on cloud', () => {
        it('shows apm on cloud standalone option', () => {
          const data: APIResponseType = {
            agents: [],
            cloudStandaloneSetup: {
              apmServerUrl: 'foo',
              secretToken: 'bar',
            },
            hasPolicyElasticOnCloud: false,
          };
          const options = getEnvironmentConfigurationOptions({
            isCloudEnabled: true,
            data,
          });
          expect(options).toEqual([
            {
              key: 'cloud_standalone',
              label: 'Default Standalone configuration',
              apmServerUrl: 'foo',
              secretToken: 'bar',
              checked: 'on',
            },
          ]);
        });
        it('shows apm on cloud standalone option and fleet agents options', () => {
          const data: APIResponseType = {
            agents,
            cloudStandaloneSetup: {
              apmServerUrl: 'foo',
              secretToken: 'bar',
            },
            hasPolicyElasticOnCloud: false,
          };
          const options = getEnvironmentConfigurationOptions({
            isCloudEnabled: true,
            data,
          });
          expect(options).toEqual([
            {
              key: 'cloud_standalone',
              label: 'Default Standalone configuration',
              apmServerUrl: 'foo',
              secretToken: 'bar',
              checked: 'on',
            },
            {
              key: '1',
              label: 'agent foo',
              apmServerUrl: 'foo',
              secretToken: 'foo',
              checked: undefined,
            },
            {
              key: '2',
              label: 'agent bar',
              apmServerUrl: 'bar',
              secretToken: 'bar',
              checked: undefined,
            },
          ]);
        });
        it('selects policy elastic agent on cloud when available', () => {
          const data: APIResponseType = {
            agents: [policyElasticAgentOnCloud, ...agents],
            cloudStandaloneSetup: {
              apmServerUrl: 'foo',
              secretToken: 'bar',
            },
            hasPolicyElasticOnCloud: true,
          };
          const options = getEnvironmentConfigurationOptions({
            isCloudEnabled: true,
            data,
          });
          expect(options).toEqual([
            {
              key: 'cloud_standalone',
              label: 'Default Standalone configuration',
              apmServerUrl: 'foo',
              secretToken: 'bar',
              checked: undefined,
            },
            {
              key: '3',
              label: 'policy-elastic-agent-on-cloud',
              apmServerUrl: 'baz',
              secretToken: 'baz',
              checked: 'on',
            },
            {
              key: '1',
              label: 'agent foo',
              apmServerUrl: 'foo',
              secretToken: 'foo',
              checked: undefined,
            },
            {
              key: '2',
              label: 'agent bar',
              apmServerUrl: 'bar',
              secretToken: 'bar',
              checked: undefined,
            },
          ]);
        });
      });
      describe('with APM on prem', () => {
        it('shows apm on prem standalone option', () => {
          const data: APIResponseType = {
            agents: [],
            cloudStandaloneSetup: undefined,
            hasPolicyElasticOnCloud: false,
          };
          const options = getEnvironmentConfigurationOptions({
            isCloudEnabled: true,
            data,
          });
          expect(options).toEqual([
            {
              key: 'onPrem_standalone',
              label: 'Default Standalone configuration',
              apmServerUrl: 'http://localhost:8200',
              secretToken: '',
              checked: 'on',
            },
          ]);
        });
        it('shows apm on prem standalone option and fleet agents options', () => {
          const data: APIResponseType = {
            agents,
            cloudStandaloneSetup: undefined,
            hasPolicyElasticOnCloud: false,
          };
          const options = getEnvironmentConfigurationOptions({
            isCloudEnabled: true,
            data,
          });
          expect(options).toEqual([
            {
              key: 'onPrem_standalone',
              label: 'Default Standalone configuration',
              apmServerUrl: 'http://localhost:8200',
              secretToken: '',
              checked: 'on',
            },
            {
              key: '1',
              label: 'agent foo',
              apmServerUrl: 'foo',
              secretToken: 'foo',
              checked: undefined,
            },
            {
              key: '2',
              label: 'agent bar',
              apmServerUrl: 'bar',
              secretToken: 'bar',
              checked: undefined,
            },
          ]);
        });
        it('selects policy elastic agent on cloud when available', () => {
          const data: APIResponseType = {
            agents: [policyElasticAgentOnCloud, ...agents],
            cloudStandaloneSetup: undefined,
            hasPolicyElasticOnCloud: true,
          };
          const options = getEnvironmentConfigurationOptions({
            isCloudEnabled: true,
            data,
          });
          expect(options).toEqual([
            {
              key: 'onPrem_standalone',
              label: 'Default Standalone configuration',
              apmServerUrl: 'http://localhost:8200',
              secretToken: '',
              checked: undefined,
            },
            {
              key: '3',
              label: 'policy-elastic-agent-on-cloud',
              apmServerUrl: 'baz',
              secretToken: 'baz',
              checked: 'on',
            },
            {
              key: '1',
              label: 'agent foo',
              apmServerUrl: 'foo',
              secretToken: 'foo',
              checked: undefined,
            },
            {
              key: '2',
              label: 'agent bar',
              apmServerUrl: 'bar',
              secretToken: 'bar',
              checked: undefined,
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
          hasPolicyElasticOnCloud: false,
        };
        const options = getEnvironmentConfigurationOptions({
          isCloudEnabled: false,
          data,
        });
        expect(options).toEqual([
          {
            key: 'onPrem_standalone',
            label: 'Default Standalone configuration',
            apmServerUrl: 'http://localhost:8200',
            secretToken: '',
            checked: 'on',
          },
        ]);
      });
      it('shows apm on prem standalone option and fleet agents options', () => {
        const data: APIResponseType = {
          agents,
          cloudStandaloneSetup: undefined,
          hasPolicyElasticOnCloud: false,
        };
        const options = getEnvironmentConfigurationOptions({
          isCloudEnabled: false,
          data,
        });
        expect(options).toEqual([
          {
            key: 'onPrem_standalone',
            label: 'Default Standalone configuration',
            apmServerUrl: 'http://localhost:8200',
            secretToken: '',
            checked: 'on',
          },
          {
            key: '1',
            label: 'agent foo',
            apmServerUrl: 'foo',
            secretToken: 'foo',
            checked: undefined,
          },
          {
            key: '2',
            label: 'agent bar',
            apmServerUrl: 'bar',
            secretToken: 'bar',
            checked: undefined,
          },
        ]);
      });
    });
  });
});
