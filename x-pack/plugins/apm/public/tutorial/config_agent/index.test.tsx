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
} from '../../utils/testHelpers';
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
        "<span class=\\"euiCodeBlock__line\\">java -javaagent:/path/to/elastic-apm-agent-<span class=\\"token operator\\">&lt;</span>version<span class=\\"token operator\\">&gt;</span>.jar <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.service_name<span class=\\"token operator\\">=</span>my-application <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.server_urls<span class=\\"token operator\\">=</span>http://localhost:8200 <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.secret_token<span class=\\"token operator\\">=</span> <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.environment<span class=\\"token operator\\">=</span>production <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.application_packages<span class=\\"token operator\\">=</span>org.example <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-jar my-application.jar</span>"
      `);

      fireEvent.click(component.getByTestId('comboBoxToggleListButton'));
      fireEvent.click(component.getByText('agent foo'));
      commands = component.getByTestId('commands').innerHTML;
      expect(commands).not.toEqual('');
      expect(commands).toMatchInlineSnapshot(`
        "<span class=\\"euiCodeBlock__line\\">java -javaagent:/path/to/elastic-apm-agent-<span class=\\"token operator\\">&lt;</span>version<span class=\\"token operator\\">&gt;</span>.jar <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.service_name<span class=\\"token operator\\">=</span>my-application <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.server_urls<span class=\\"token operator\\">=</span>foo <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.secret_token<span class=\\"token operator\\">=</span>foo <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.environment<span class=\\"token operator\\">=</span>production <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.application_packages<span class=\\"token operator\\">=</span>org.example <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-jar my-application.jar</span>"
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
          "<span class=\\"euiCodeBlock__line\\">java -javaagent:/path/to/elastic-apm-agent-<span class=\\"token operator\\">&lt;</span>version<span class=\\"token operator\\">&gt;</span>.jar <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.service_name<span class=\\"token operator\\">=</span>my-application <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.server_urls<span class=\\"token operator\\">=</span>http://localhost:8200 <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.secret_token<span class=\\"token operator\\">=</span> <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.environment<span class=\\"token operator\\">=</span>production <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.application_packages<span class=\\"token operator\\">=</span>org.example <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-jar my-application.jar</span>"
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
          "<span class=\\"euiCodeBlock__line\\">java -javaagent:/path/to/elastic-apm-agent-<span class=\\"token operator\\">&lt;</span>version<span class=\\"token operator\\">&gt;</span>.jar <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.service_name<span class=\\"token operator\\">=</span>my-application <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.server_urls<span class=\\"token operator\\">=</span>http://localhost:8200 <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.secret_token<span class=\\"token operator\\">=</span> <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.environment<span class=\\"token operator\\">=</span>production <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.application_packages<span class=\\"token operator\\">=</span>org.example <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-jar my-application.jar</span>"
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
          "<span class=\\"euiCodeBlock__line\\">java -javaagent:/path/to/elastic-apm-agent-<span class=\\"token operator\\">&lt;</span>version<span class=\\"token operator\\">&gt;</span>.jar <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.service_name<span class=\\"token operator\\">=</span>my-application <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.server_urls<span class=\\"token operator\\">=</span>cloud_url <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.secret_token<span class=\\"token operator\\">=</span>cloud_token <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.environment<span class=\\"token operator\\">=</span>production <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.application_packages<span class=\\"token operator\\">=</span>org.example <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-jar my-application.jar</span>"
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
          "<span class=\\"euiCodeBlock__line\\">java -javaagent:/path/to/elastic-apm-agent-<span class=\\"token operator\\">&lt;</span>version<span class=\\"token operator\\">&gt;</span>.jar <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.service_name<span class=\\"token operator\\">=</span>my-application <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.server_urls<span class=\\"token operator\\">=</span>apm_cloud_url <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.secret_token<span class=\\"token operator\\">=</span>apm_cloud_token <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.environment<span class=\\"token operator\\">=</span>production <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.application_packages<span class=\\"token operator\\">=</span>org.example <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-jar my-application.jar</span>"
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
          "<span class=\\"euiCodeBlock__line\\">java -javaagent:/path/to/elastic-apm-agent-<span class=\\"token operator\\">&lt;</span>version<span class=\\"token operator\\">&gt;</span>.jar <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.service_name<span class=\\"token operator\\">=</span>my-application <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.server_urls<span class=\\"token operator\\">=</span>http://localhost:8200 <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.secret_token<span class=\\"token operator\\">=</span> <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.environment<span class=\\"token operator\\">=</span>production <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.application_packages<span class=\\"token operator\\">=</span>org.example <span class=\\"token punctuation\\">\\\\</span>
          </span><span class=\\"euiCodeBlock__line\\">-jar my-application.jar</span>"
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
        "<span class=\\"euiCodeBlock__line\\">java -javaagent:/path/to/elastic-apm-agent-<span class=\\"token operator\\">&lt;</span>version<span class=\\"token operator\\">&gt;</span>.jar <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.service_name<span class=\\"token operator\\">=</span>my-application <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.server_urls<span class=\\"token operator\\">=</span>http://localhost:8200 <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.secret_token<span class=\\"token operator\\">=</span> <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.environment<span class=\\"token operator\\">=</span>production <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.application_packages<span class=\\"token operator\\">=</span>org.example <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-jar my-application.jar</span>"
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
        "<span class=\\"euiCodeBlock__line\\">java -javaagent:/path/to/elastic-apm-agent-<span class=\\"token operator\\">&lt;</span>version<span class=\\"token operator\\">&gt;</span>.jar <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.service_name<span class=\\"token operator\\">=</span>my-application <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.server_urls<span class=\\"token operator\\">=</span>cloud_url <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.secret_token<span class=\\"token operator\\">=</span>cloud_token <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.environment<span class=\\"token operator\\">=</span>production <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-Delastic.apm.application_packages<span class=\\"token operator\\">=</span>org.example <span class=\\"token punctuation\\">\\\\</span>
        </span><span class=\\"euiCodeBlock__line\\">-jar my-application.jar</span>"
      `);
    });
  });
});
