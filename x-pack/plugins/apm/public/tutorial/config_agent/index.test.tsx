/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { HttpStart } from 'kibana/public';
import React from 'react';
import {
  expectTextsInDocument,
  expectTextsNotInDocument,
} from '../../utils/test_helpers';
import TutorialConfigAgent from './';

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

describe('TutorialConfigAgent', () => {
  beforeAll(() => {
    // Mocks console.error so it won't polute tests output when testing the api throwing error
    jest.spyOn(console, 'error').mockImplementation(() => null);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('when fleet plugin is enabled', () => {
    it('renders loading component while API is being called', () => {
      const component = render(
        <TutorialConfigAgent
          variantId="java"
          http={
            {
              get: jest.fn(),
            } as unknown as HttpStart
          }
          basePath="http://localhost:5601"
          isCloudEnabled
          kibanaVersion="8.0.0"
        />
      );
      expect(component.getByTestId('loading')).toBeInTheDocument();
    });
    it('updates commands when a different policy is selected', async () => {
      const component = render(
        <TutorialConfigAgent
          variantId="java"
          http={
            {
              get: jest.fn().mockReturnValue({
                cloudStandaloneSetup: undefined,
                fleetAgents,
                isFleetEnabled: true,
              }),
            } as unknown as HttpStart
          }
          basePath="http://localhost:5601"
          isCloudEnabled={false}
          kibanaVersion="8.0.0"
        />
      );
      expect(
        await screen.findByText('Default Standalone configuration')
      ).toBeInTheDocument();
      let commands = component.getByTestId('commands').innerHTML;
      expect(commands).not.toEqual('');
      expect(commands).toMatchInlineSnapshot(`
        "java -javaagent:/path/to/elastic-apm-agent-&lt;version&gt;.jar \\\\
        -Delastic.apm.service_name=my-application \\\\
        -Delastic.apm.server_urls=http://localhost:8200 \\\\
        -Delastic.apm.secret_token= \\\\
        -Delastic.apm.environment=production \\\\
        -Delastic.apm.application_packages=org.example \\\\
        -jar my-application.jar"
      `);

      fireEvent.click(component.getByTestId('comboBoxToggleListButton'));
      fireEvent.click(component.getByText('agent foo'));
      commands = component.getByTestId('commands').innerHTML;
      expect(commands).not.toEqual('');
      expect(commands).toMatchInlineSnapshot(`
        "java -javaagent:/path/to/elastic-apm-agent-&lt;version&gt;.jar \\\\
        -Delastic.apm.service_name=my-application \\\\
        -Delastic.apm.server_urls=foo \\\\
        -Delastic.apm.secret_token=foo \\\\
        -Delastic.apm.environment=production \\\\
        -Delastic.apm.application_packages=org.example \\\\
        -jar my-application.jar"
      `);
    });
    describe('running on prem', () => {
      it('selects defaul standalone by defauls', async () => {
        const component = render(
          <TutorialConfigAgent
            variantId="java"
            http={
              {
                get: jest.fn().mockReturnValue({
                  cloudStandaloneSetup: undefined,
                  fleetAgents,
                  isFleetEnabled: true,
                }),
              } as unknown as HttpStart
            }
            basePath="http://localhost:5601"
            isCloudEnabled={false}
            kibanaVersion="8.0.0"
          />
        );
        expect(
          await screen.findByText('Default Standalone configuration')
        ).toBeInTheDocument();
        expect(
          component.getByTestId('policySelector_onPrem')
        ).toBeInTheDocument();
        const commands = component.getByTestId('commands').innerHTML;
        expect(commands).not.toEqual('');
        expect(commands).toMatchInlineSnapshot(`
          "java -javaagent:/path/to/elastic-apm-agent-&lt;version&gt;.jar \\\\
          -Delastic.apm.service_name=my-application \\\\
          -Delastic.apm.server_urls=http://localhost:8200 \\\\
          -Delastic.apm.secret_token= \\\\
          -Delastic.apm.environment=production \\\\
          -Delastic.apm.application_packages=org.example \\\\
          -jar my-application.jar"
        `);
      });
      it('shows get started with fleet link when there are no fleet agents', async () => {
        const component = render(
          <TutorialConfigAgent
            variantId="java"
            http={
              {
                get: jest.fn().mockReturnValue({
                  cloudStandaloneSetup: undefined,
                  fleetAgents: [],
                  isFleetEnabled: true,
                }),
              } as unknown as HttpStart
            }
            basePath="http://localhost:5601"
            isCloudEnabled
            kibanaVersion="8.0.0"
          />
        );
        expect(
          await screen.findByText('Default Standalone configuration')
        ).toBeInTheDocument();
        expect(
          component.getByTestId('policySelector_onPrem')
        ).toBeInTheDocument();
        const commands = component.getByTestId('commands').innerHTML;
        expect(commands).not.toEqual('');
        expect(commands).toMatchInlineSnapshot(`
          "java -javaagent:/path/to/elastic-apm-agent-&lt;version&gt;.jar \\\\
          -Delastic.apm.service_name=my-application \\\\
          -Delastic.apm.server_urls=http://localhost:8200 \\\\
          -Delastic.apm.secret_token= \\\\
          -Delastic.apm.environment=production \\\\
          -Delastic.apm.application_packages=org.example \\\\
          -jar my-application.jar"
        `);
        expectTextsInDocument(component, ['Get started with fleet']);
      });
    });
    describe('running on cloud', () => {
      it('selects defaul standalone by defauls', async () => {
        const component = render(
          <TutorialConfigAgent
            variantId="java"
            http={
              {
                get: jest.fn().mockReturnValue({
                  cloudStandaloneSetup: {
                    apmServerUrl: 'cloud_url',
                    secretToken: 'cloud_token',
                  },
                  fleetAgents,
                  isFleetEnabled: true,
                }),
              } as unknown as HttpStart
            }
            basePath="http://localhost:5601"
            isCloudEnabled
            kibanaVersion="8.0.0"
          />
        );
        expect(
          await screen.findByText('Default Standalone configuration')
        ).toBeInTheDocument();
        expect(
          component.getByTestId('policySelector_cloud')
        ).toBeInTheDocument();
        const commands = component.getByTestId('commands').innerHTML;
        expect(commands).not.toEqual('');
        expect(commands).toMatchInlineSnapshot(`
          "java -javaagent:/path/to/elastic-apm-agent-&lt;version&gt;.jar \\\\
          -Delastic.apm.service_name=my-application \\\\
          -Delastic.apm.server_urls=cloud_url \\\\
          -Delastic.apm.secret_token=cloud_token \\\\
          -Delastic.apm.environment=production \\\\
          -Delastic.apm.application_packages=org.example \\\\
          -jar my-application.jar"
        `);
      });
      it('selects policy elastic agent on cloud when available by default', async () => {
        const component = render(
          <TutorialConfigAgent
            variantId="java"
            http={
              {
                get: jest.fn().mockReturnValue({
                  cloudStandaloneSetup: {
                    apmServerUrl: 'cloud_url',
                    secretToken: 'cloud_token',
                  },
                  fleetAgents: [...fleetAgents, policyElasticAgentOnCloudAgent],
                  isFleetEnabled: true,
                }),
              } as unknown as HttpStart
            }
            basePath="http://localhost:5601"
            isCloudEnabled
            kibanaVersion="8.0.0"
          />
        );
        expect(
          await screen.findByText('Elastic Cloud agent policy')
        ).toBeInTheDocument();
        expect(
          component.getByTestId('policySelector_policy-elastic-agent-on-cloud')
        ).toBeInTheDocument();
        const commands = component.getByTestId('commands').innerHTML;
        expect(commands).not.toEqual('');
        expect(commands).toMatchInlineSnapshot(`
          "java -javaagent:/path/to/elastic-apm-agent-&lt;version&gt;.jar \\\\
          -Delastic.apm.service_name=my-application \\\\
          -Delastic.apm.server_urls=apm_cloud_url \\\\
          -Delastic.apm.secret_token=apm_cloud_token \\\\
          -Delastic.apm.environment=production \\\\
          -Delastic.apm.application_packages=org.example \\\\
          -jar my-application.jar"
        `);
      });

      it('shows default standalone option when api throws an error', async () => {
        const component = render(
          <TutorialConfigAgent
            variantId="java"
            http={
              {
                get: () => {
                  throw new Error('Boom');
                },
              } as unknown as HttpStart
            }
            basePath="http://localhost:5601"
            isCloudEnabled
            kibanaVersion="8.0.0"
          />
        );
        expect(
          await screen.findByText('Default Standalone configuration')
        ).toBeInTheDocument();
        const commands = component.getByTestId('commands').innerHTML;
        expect(commands).not.toEqual('');
        expect(commands).toMatchInlineSnapshot(`
          "java -javaagent:/path/to/elastic-apm-agent-&lt;version&gt;.jar \\\\
          -Delastic.apm.service_name=my-application \\\\
          -Delastic.apm.server_urls=http://localhost:8200 \\\\
          -Delastic.apm.secret_token= \\\\
          -Delastic.apm.environment=production \\\\
          -Delastic.apm.application_packages=org.example \\\\
          -jar my-application.jar"
        `);
      });
    });
  });
  describe('when fleet plugin is disabled', () => {
    it('hides fleet links', async () => {
      const component = render(
        <TutorialConfigAgent
          variantId="java"
          http={
            {
              get: jest.fn().mockReturnValue({
                cloudStandaloneSetup: undefined,
                fleetAgents: [],
                isFleetEnabled: false,
              }),
            } as unknown as HttpStart
          }
          basePath="http://localhost:5601"
          isCloudEnabled
          kibanaVersion="8.0.0"
        />
      );

      expectTextsNotInDocument(component, [
        'Get started with fleet',
        'Manage fleet policies',
      ]);
    });
    it('shows default standalone on prem', async () => {
      const component = render(
        <TutorialConfigAgent
          variantId="java"
          http={
            {
              get: jest.fn().mockReturnValue({
                cloudStandaloneSetup: undefined,
                fleetAgents: [],
                isFleetEnabled: false,
              }),
            } as unknown as HttpStart
          }
          basePath="http://localhost:5601"
          isCloudEnabled
          kibanaVersion="8.0.0"
        />
      );
      expect(
        await screen.findByText('Default Standalone configuration')
      ).toBeInTheDocument();
      expect(
        component.getByTestId('policySelector_onPrem')
      ).toBeInTheDocument();
      const commands = component.getByTestId('commands').innerHTML;
      expect(commands).not.toEqual('');
      expect(commands).toMatchInlineSnapshot(`
        "java -javaagent:/path/to/elastic-apm-agent-&lt;version&gt;.jar \\\\
        -Delastic.apm.service_name=my-application \\\\
        -Delastic.apm.server_urls=http://localhost:8200 \\\\
        -Delastic.apm.secret_token= \\\\
        -Delastic.apm.environment=production \\\\
        -Delastic.apm.application_packages=org.example \\\\
        -jar my-application.jar"
      `);
    });
    it('shows default standalone on cloud', async () => {
      const component = render(
        <TutorialConfigAgent
          variantId="java"
          http={
            {
              get: jest.fn().mockReturnValue({
                cloudStandaloneSetup: {
                  apmServerUrl: 'cloud_url',
                  secretToken: 'cloud_token',
                },
                fleetAgents: [],
                isFleetEnabled: false,
              }),
            } as unknown as HttpStart
          }
          basePath="http://localhost:5601"
          isCloudEnabled
          kibanaVersion="8.0.0"
        />
      );
      expect(
        await screen.findByText('Default Standalone configuration')
      ).toBeInTheDocument();
      expect(component.getByTestId('policySelector_cloud')).toBeInTheDocument();
      const commands = component.getByTestId('commands').innerHTML;
      expect(commands).not.toEqual('');
      expect(commands).toMatchInlineSnapshot(`
        "java -javaagent:/path/to/elastic-apm-agent-&lt;version&gt;.jar \\\\
        -Delastic.apm.service_name=my-application \\\\
        -Delastic.apm.server_urls=cloud_url \\\\
        -Delastic.apm.secret_token=cloud_token \\\\
        -Delastic.apm.environment=production \\\\
        -Delastic.apm.application_packages=org.example \\\\
        -jar my-application.jar"
      `);
    });
  });
});
