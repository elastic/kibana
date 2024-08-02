/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../../../mock';

import type { TestRenderer } from '../../../../../../../../mock';
import { useAgentless } from '../../../single_page_layout/hooks/setup_technology';

import type {
  PackageInfo,
  RegistryStreamWithDataStream,
  RegistryInput,
  NewPackagePolicyInput,
} from '../../../../../../types';

import { shouldShowStreamsByDefault, PackagePolicyInputPanel } from './package_policy_input_panel';

jest.mock('../../../single_page_layout/hooks/setup_technology', () => {
  return {
    useAgentless: jest.fn(),
  };
});
const useAgentlessMock = useAgentless as jest.MockedFunction<typeof useAgentless>;

describe('shouldShowStreamsByDefault', () => {
  it('should return true if a datastreamId is provided and contained in the input', () => {
    const res = shouldShowStreamsByDefault(
      {} as any,
      [],
      {
        enabled: true,
        streams: [
          {
            id: 'datastream-id',
          },
        ],
      } as any,
      'datastream-id'
    );
    expect(res).toBeTruthy();
  });

  it('should return false if a datastreamId is provided but not contained in the input', () => {
    const res = shouldShowStreamsByDefault(
      {} as any,
      [],
      {
        enabled: true,
        streams: [
          {
            id: 'datastream-1',
          },
        ],
      } as any,
      'datastream-id'
    );
    expect(res).toBeFalsy();
  });

  it('should return false if a datastreamId is provided but the input is disabled', () => {
    const res = shouldShowStreamsByDefault(
      {} as any,
      [],
      {
        enabled: false,
        streams: [
          {
            id: 'datastream-id',
          },
        ],
      } as any,
      'datastream-id'
    );
    expect(res).toBeFalsy();
  });
});

describe('PackagePolicyInputPanel', () => {
  const mockPackageInfo = {
    name: 'agentless_test_package',
    version: '1.0.1-rc1',
    description: 'Test package with new agentless deployment modes',
    title: 'Agentless test package',
    format_version: '3.2.0',
    owner: {
      github: 'elastic/integrations',
      type: 'elastic',
    },
    type: 'integration',
    categories: ['custom'],
    screenshots: [],
    icons: [],
    policy_templates: [
      {
        name: 'sample',
        title: 'Agentless sample logs',
        description: 'Collect sample logs',
        multiple: true,
        inputs: [
          {
            title: 'Collect sample logs from instances',
            vars: [],
            type: 'logfile',
            description: 'Collecting sample logs',
          },
        ],
        deployment_modes: {
          default: {
            enabled: false,
          },
          agentless: {
            enabled: true,
          },
        },
      },
    ],
    data_streams: [
      {
        title: 'Default data stream',
        release: 'ga',
        type: 'logs',
        package: 'agentless_test_package',
        dataset: 'agentless_test_package.default_data_stream',
        path: 'default_data_stream',
        elasticsearch: {
          'ingest_pipeline.name': 'default',
        },
        ingest_pipeline: 'default',
        streams: [
          {
            input: 'logfile',
            title: 'Sample logs hidden in agentless',
            template_path: 'stream.yml.hbs',
            vars: [
              {
                name: 'paths',
                type: 'text',
                title: 'Paths',
                multi: false,
                default: ['/var/log/*.log'],
                required: false,
                show_user: true,
                hide_in_deployment_modes: ['agentless'],
              },
            ],
            description: 'Collect sample logs - hidden in agentless',
          },
        ],
      },
      {
        title: 'Logs Stream on Agentless',
        release: 'ga',
        type: 'logs',
        package: 'agentless_test_package',
        dataset: 'agentless_test_package.logs_stream',
        path: 'logs_stream',
        elasticsearch: {
          'ingest_pipeline.name': 'default',
        },
        ingest_pipeline: 'default',
        streams: [
          {
            input: 'logfile',
            title: 'Sample logs on Agentless',
            template_path: 'stream.yml.hbs',
            vars: [
              {
                name: 'paths',
                type: 'text',
                title: 'Paths',
                multi: true,
                default: ['/var/log/*.log'],
                required: false,
                show_user: true,
                hide_in_deployment_modes: ['default'],
              },
            ],
            description: 'Collect sample logs on Agentless only',
          },
        ],
      },
    ],
    readme: '/package/agentless_test_package/1.0.1-rc1/docs/README.md',
    release: 'beta',
    latestVersion: '1.0.1-rc1',
    assets: { kibana: {} },
    licensePath: '/package/agentless_test_package/1.0.1-rc1/LICENSE.txt',
    keepPoliciesUpToDate: false,
    status: 'installed',
    installationInfo: {},
  } as unknown as PackageInfo;

  const mockPackageInput: RegistryInput = {
    title: 'Collect sample logs from instances',
    vars: [],
    type: 'logfile',
    description: 'Collecting sample logs',
  };

  const mockPackageInputStreams: RegistryStreamWithDataStream[] = [
    {
      input: 'logfile',
      title: 'Sample logs hidden in agentless',
      template_path: 'stream.yml.hbs',
      vars: [
        {
          name: 'paths',
          type: 'text',
          title: 'Paths',
          multi: false,
          default: ['/var/log/*.log'],
          required: false,
          show_user: true,
          hide_in_deployment_modes: ['agentless'],
        },
      ],
      description: 'Collect sample logs - hidden in agentless',
      data_stream: {
        title: 'Default data stream',
        release: 'ga',
        type: 'logs',
        package: 'agentless_test_package',
        dataset: 'agentless_test_package.default_data_stream',
        path: 'default_data_stream',
        elasticsearch: {
          'ingest_pipeline.name': 'default',
        },
        ingest_pipeline: 'default',
        streams: [
          {
            input: 'logfile',
            title: 'Sample logs hidden in agentless',
            template_path: 'stream.yml.hbs',
            vars: [
              {
                name: 'paths',
                type: 'text',
                title: 'Paths',
                multi: false,
                default: ['/var/log/*.log'],
                required: false,
                show_user: true,
                hide_in_deployment_modes: ['agentless'],
              },
            ],
            description: 'Collect sample logs - hidden in agentless',
          },
        ],
      },
    },
    {
      input: 'logfile',
      title: 'Sample logs on Agentless',
      template_path: 'stream.yml.hbs',
      vars: [
        {
          name: 'paths',
          type: 'text',
          title: 'Paths',
          multi: true,
          default: ['/var/log/*.log'],
          required: false,
          show_user: true,
          hide_in_deployment_modes: ['default'],
        },
      ],
      description: 'Collect sample logs on Agentless only',
      data_stream: {
        title: 'Logs Stream on Agentless',
        release: 'ga',
        type: 'logs',
        package: 'agentless_test_package',
        dataset: 'agentless_test_package.logs_stream',
        path: 'logs_stream',
        elasticsearch: {
          'ingest_pipeline.name': 'default',
        },
        ingest_pipeline: 'default',
        streams: [
          {
            input: 'logfile',
            title: 'Sample logs on Agentless',
            template_path: 'stream.yml.hbs',
            vars: [
              {
                name: 'paths',
                type: 'text',
                title: 'Paths',
                multi: true,
                default: ['/var/log/*.log'],
                required: false,
                show_user: true,
                hide_in_deployment_modes: ['default'],
              },
            ],
            description: 'Collect sample logs on Agentless only',
          },
        ],
      },
    },
  ];
  const mockUpdatePackagePolicyInput = jest.fn().mockImplementation((val: any) => {
    return undefined;
  });
  const inputValidationResults = {
    streams: {
      'agentless_test_package.default_data_stream': { vars: { paths: null } },
      'agentless_test_package.logs_stream': { vars: { paths: null } },
    },
  };

  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  const packagePolicyInput = {
    id: 'input-1',
    type: 'logfile',
    policy_template: 'sample',
    enabled: true,
    streams: [
      {
        data_stream: { type: 'logs', dataset: 'agentless_test_package.default_data_stream' },
        enabled: true,
        vars: { paths: [] },
      },
      {
        data_stream: { type: 'logs', dataset: 'agentless_test_package.logs_stream' },
        enabled: true,
        vars: { paths: [] },
      },
    ],
  } as NewPackagePolicyInput;
  const render = (
    packageInfo: PackageInfo,
    packageInputStreams: RegistryStreamWithDataStream[]
  ) => {
    renderResult = testRenderer.render(
      <PackagePolicyInputPanel
        packageInfo={packageInfo}
        packageInput={mockPackageInput}
        packageInputStreams={packageInputStreams}
        packagePolicyInput={packagePolicyInput}
        updatePackagePolicyInput={mockUpdatePackagePolicyInput}
        inputValidationResults={inputValidationResults}
      />
    );
  };
  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
  });
  afterEach(() => {
    jest.resetAllMocks();
  });
  describe('When agentless is enabled', () => {
    beforeEach(() => {
      useAgentlessMock.mockReturnValue({
        agentlessAPIUrl: 'https://agentless.api.url',
        isAgentlessEnabled: true,
        isAgentlessPackagePolicy: jest.fn(),
        isAgentlessAgentPolicy: jest.fn(),
        isAgentlessIntegration: jest.fn(),
        isAgentlessCloudEnabled: true,
        isAgentlessServerlessEnabled: false,
      });
    });

    it('should render inputs specific to env', async () => {
      render(mockPackageInfo, mockPackageInputStreams);
      await waitFor(async () => {
        expect(
          await renderResult.findByTestId('PackagePolicy.InputStreamConfig.Switch')
        ).toBeInTheDocument();
      });
      await waitFor(async () => {
        expect(
          await renderResult.findByText('Collect sample logs from instances')
        ).toBeInTheDocument();
      });
      await waitFor(async () => {
        expect(await renderResult.findByText('Sample logs on Agentless')).toBeInTheDocument();
      });
      await waitFor(async () => {
        expect(
          await renderResult.queryByText('Sample logs hidden in agentless')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('When agentless not enabled', () => {
    beforeEach(() => {
      useAgentlessMock.mockReturnValue({
        agentlessAPIUrl: undefined,
        isAgentlessEnabled: false,
        isAgentlessPackagePolicy: jest.fn(),
        isAgentlessAgentPolicy: jest.fn(),
        isAgentlessIntegration: jest.fn(),
        isAgentlessCloudEnabled: true,
        isAgentlessServerlessEnabled: false,
      });
    });

    it('should render inputs specific to the env', async () => {
      render(mockPackageInfo, mockPackageInputStreams);
      await waitFor(async () => {
        expect(
          await renderResult.findByTestId('PackagePolicy.InputStreamConfig.Switch')
        ).toBeInTheDocument();
      });
      await waitFor(async () => {
        expect(
          await renderResult.findByText('Collect sample logs from instances')
        ).toBeInTheDocument();
      });
      await waitFor(async () => {
        expect(await renderResult.queryByText('Sample logs on Agentless')).not.toBeInTheDocument();
      });
      await waitFor(async () => {
        expect(
          await renderResult.queryByText('Sample logs hidden in agentless')
        ).toBeInTheDocument();
      });
    });

    it('should render inputs when hide_in_deployment_modes is not present', async () => {
      const packageInputStreams: RegistryStreamWithDataStream[] = [
        {
          input: 'logfile',
          title: 'Sample logs',
          template_path: 'stream.yml.hbs',
          vars: [
            {
              name: 'paths',
              type: 'text',
              title: 'Paths',
              multi: false,
              default: ['/var/log/*.log'],
              required: false,
              show_user: true,
            },
          ],
          description: 'Collect sample logs',
          data_stream: {
            title: 'Default data stream',
            release: 'ga',
            type: 'logs',
            package: 'agentless_test_package',
            dataset: 'agentless_test_package.default_data_stream',
            path: 'default_data_stream',
            elasticsearch: {
              'ingest_pipeline.name': 'default',
            },
            ingest_pipeline: 'default',
            streams: [
              {
                input: 'logfile',
                title: 'Sample logs',
                template_path: 'stream.yml.hbs',
                vars: [
                  {
                    name: 'paths',
                    type: 'text',
                    title: 'Paths',
                    multi: false,
                    default: ['/var/log/*.log'],
                    required: false,
                    show_user: true,
                  },
                ],
                description: 'Collect sample log - hidden in agentless',
              },
            ],
          },
        },
      ];
      const packageInfo = {
        ...mockPackageInfo,
        data_streams: [
          {
            title: 'Default data stream',
            release: 'ga',
            type: 'logs',
            package: 'agentless_test_package',
            dataset: 'agentless_test_package.default_data_stream',
            path: 'default_data_stream',
            elasticsearch: {
              'ingest_pipeline.name': 'default',
            },
            ingest_pipeline: 'default',
            streams: [
              {
                input: 'logfile',
                title: 'Sample logs',
                template_path: 'stream.yml.hbs',
                vars: [
                  {
                    name: 'paths',
                    type: 'text',
                    title: 'Paths',
                    multi: false,
                    default: ['/var/log/*.log'],
                    required: false,
                    show_user: true,
                  },
                ],
                description: 'Collect sample logs',
              },
            ],
          },
        ],
      } as unknown as PackageInfo;
      render(packageInfo, packageInputStreams);

      await waitFor(async () => {
        expect(
          await renderResult.findByText('Collect sample logs from instances')
        ).toBeInTheDocument();
      });
      await waitFor(async () => {
        expect(await renderResult.findByText('Sample logs')).toBeInTheDocument();
      });
      await waitFor(async () => {
        expect(await renderResult.findByText('Collect sample logs')).toBeInTheDocument();
      });
    });
  });
});
