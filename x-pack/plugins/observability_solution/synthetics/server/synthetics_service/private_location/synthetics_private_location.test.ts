/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  MonitorTypeEnum,
  MonitorFields,
  ScheduleUnit,
  SourceType,
  HeartbeatConfig,
} from '../../../common/runtime_types';
import { SyntheticsPrivateLocation } from './synthetics_private_location';
import { testMonitorPolicy } from './test_policy';
import { formatSyntheticsPolicy } from '../formatters/private_formatters/format_synthetics_policy';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { SyntheticsServerSetup } from '../../types';
import { PrivateLocationAttributes } from '../../runtime_types/private_locations';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

describe('SyntheticsPrivateLocation', () => {
  const mockPrivateLocation: PrivateLocationAttributes = {
    id: 'policyId',
    label: 'Test Location',
    agentPolicyId: 'policyId',
    isServiceManaged: false,
  };
  const testConfig = {
    id: 'testId',
    type: 'http',
    enabled: true,
    schedule: '@every 3m',
    'service.name': 'test service',
    locations: [mockPrivateLocation],
    tags: [],
    timeout: '16',
    name: 'Test Monitor',
    urls: 'https://www.google.com',
    max_redirects: '0',
    password: '12345678',
    proxy_url: '',
    'check.response.body.negative': [],
    'check.response.body.positive': [],
    'response.include_body': 'on_error',
    'check.response.headers': {},
    'response.include_headers': true,
    'check.response.status': [],
    'check.request.body': { type: 'text', value: '' },
    'check.request.headers': {},
    'check.request.method': 'GET',
    username: '',
  } as unknown as HeartbeatConfig;
  const mockBuildPackagePolicy = jest.fn().mockReturnValue(undefined);

  const serverMock: SyntheticsServerSetup = {
    syntheticsEsClient: { search: jest.fn() },
    logger: loggerMock.create(),
    config: {
      service: {
        username: 'dev',
        password: '12345',
        manifestUrl: 'http://localhost:8080/api/manifest',
      },
    },
    fleet: {
      packagePolicyService: {
        get: jest.fn().mockReturnValue({}),
        buildPackagePolicyFromPackage: mockBuildPackagePolicy,
        bulkCreate: jest.fn(),
        getByIDs: jest.fn(),
      },
    },
    spaces: {
      spacesService: {
        getSpaceId: jest.fn().mockReturnValue('nonDefaultSpace'),
      },
    },
    coreStart: {
      savedObjects: savedObjectsServiceMock.createStartContract(),
      elasticsearch: elasticsearchServiceMock.createStart(),
    },
  } as unknown as SyntheticsServerSetup;
  beforeEach(() => {
    mockBuildPackagePolicy.mockReturnValue(undefined);
  });

  describe('getPolicyNamespace', () => {
    it('prioritizes config namespace', async () => {
      const configNamespace = 'nonDefaultSpace';
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const result = await syntheticsPrivateLocation.getPolicyNamespace(configNamespace);
      expect(result).toEqual(configNamespace);
    });

    it('falls back to undefined when config namespace and private location namespace are not defined', async () => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation(serverMock);
      const result = await syntheticsPrivateLocation.getPolicyNamespace('default');
      expect(result).toEqual(undefined);
    });
  });

  it.each([['Unable to create Synthetics package policy template for private location']])(
    'throws errors for create monitor',
    async (error) => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
        ...serverMock,
        fleet: {
          ...serverMock.fleet,
        },
      });

      try {
        await syntheticsPrivateLocation.createPackagePolicies(
          [{ config: testConfig, globalParams: {} }],
          [mockPrivateLocation],
          'test-space'
        );
      } catch (e) {
        expect(e).toEqual(new Error(error));
      }
    }
  );

  it.each([['Unable to create Synthetics package policy template for private location']])(
    'throws errors for edit monitor',
    async (error) => {
      const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
        ...serverMock,
        fleet: {
          ...serverMock.fleet,
        },
      });

      try {
        await syntheticsPrivateLocation.editMonitors(
          [{ config: testConfig, globalParams: {} }],
          [mockPrivateLocation],
          'test-space'
        );
      } catch (e) {
        expect(e).toEqual(new Error(error));
      }
    }
  );

  it.each([
    [
      'Unable to delete Synthetics package policy for monitor Test Monitor with private location Test Location',
    ],
    [
      'Unable to delete Synthetics package policy for monitor Test Monitor. Fleet write permissions are needed to use Synthetics private locations.',
    ],
  ])('throws errors for delete monitor', async (error) => {
    const syntheticsPrivateLocation = new SyntheticsPrivateLocation({
      ...serverMock,
      fleet: {
        ...serverMock.fleet,
        packagePolicyService: {
          ...serverMock.fleet.packagePolicyService,
          delete(
            soClient: SavedObjectsClientContract,
            esClient: any,
            ids: string[],
            options?: any
          ): any {
            throw new Error(error);
          },
        },
      },
    });
    try {
      await syntheticsPrivateLocation.deleteMonitors([testConfig], 'test-space');
    } catch (e) {
      expect(e).toEqual(new Error(error));
    }
  });

  it('formats monitors stream properly', () => {
    const test = formatSyntheticsPolicy(
      testMonitorPolicy,
      MonitorTypeEnum.BROWSER,
      dummyBrowserConfig,
      {}
    );

    expect(test.formattedPolicy.inputs[3].streams[1]).toStrictEqual({
      data_stream: {
        dataset: 'browser',
        type: 'synthetics',
      },
      enabled: true,
      vars: {
        __ui: {
          type: 'yaml',
          value:
            '{"script_source":{"is_generated_script":false,"file_name":""},"is_tls_enabled":true}',
        },
        config_id: {
          type: 'text',
          value: '75cdd125-5b62-4459-870c-46f59bf37e89',
        },
        enabled: {
          type: 'bool',
          value: true,
        },
        'filter_journeys.match': {
          type: 'text',
          value: null,
        },
        'filter_journeys.tags': {
          type: 'yaml',
          value: null,
        },
        ignore_https_errors: {
          type: 'bool',
          value: false,
        },
        location_name: {
          type: 'text',
          value: 'Fleet managed',
        },
        name: {
          type: 'text',
          value: '"Browser monitor"',
        },
        params: {
          type: 'yaml',
          value: '',
        },
        run_once: {
          type: 'bool',
          value: false,
        },
        schedule: {
          type: 'text',
          value: '"@every 10m"',
        },
        screenshots: {
          type: 'text',
          value: 'on',
        },
        'service.name': {
          type: 'text',
          value: '"test service"',
        },
        'source.inline.script': {
          type: 'yaml',
          value:
            "\"step('Go to https://www.elastic.co/', async () => {\\n  await page.goto('https://www.elastic.co/');\\n});\"",
        },
        synthetics_args: {
          type: 'text',
          value: null,
        },
        tags: {
          type: 'yaml',
          value: null,
        },
        'throttling.config': {
          type: 'text',
          value: JSON.stringify({ download: 5, upload: 3, latency: 20 }),
        },
        timeout: {
          type: 'text',
          value: null,
        },
        type: {
          type: 'text',
          value: 'browser',
        },
      },
    });
  });
});

const dummyBrowserConfig: Partial<MonitorFields> & {
  id: string;
  fields: Record<string, string | boolean>;
  fields_under_root: boolean;
} = {
  type: MonitorTypeEnum.BROWSER,
  enabled: true,
  schedule: { unit: ScheduleUnit.MINUTES, number: '10' },
  'service.name': 'test service',
  tags: [],
  timeout: null,
  name: 'Browser monitor',
  locations: [{ isServiceManaged: false, id: '1' }],
  namespace: 'default',
  origin: SourceType.UI,
  journey_id: '',
  project_id: '',
  playwright_options: '',
  __ui: {
    script_source: { is_generated_script: false, file_name: '' },
    is_tls_enabled: true,
  },
  params: '',
  'url.port': 443,
  'source.inline.script':
    "step('Go to https://www.elastic.co/', async () => {\n  await page.goto('https://www.elastic.co/');\n});",
  'source.project.content': '',
  urls: 'https://www.elastic.co/',
  screenshots: 'on',
  synthetics_args: [],
  'filter_journeys.match': '',
  'filter_journeys.tags': [],
  ignore_https_errors: false,
  throttling: { value: { download: '5', upload: '3', latency: '20' }, label: 'test', id: 'test' },
  id: '75cdd125-5b62-4459-870c-46f59bf37e89',
  config_id: '75cdd125-5b62-4459-870c-46f59bf37e89',
  fields: { config_id: '75cdd125-5b62-4459-870c-46f59bf37e89', run_once: true },
  fields_under_root: true,
  max_redirects: '0',
};
