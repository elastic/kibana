/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RegistryPolicyInputOnlyTemplate,
  RegistryPolicyIntegrationTemplate,
  PackageInfo,
  RegistryVarType,
  PackageListItem,
} from '../types';

import {
  isInputOnlyPolicyTemplate,
  isIntegrationPolicyTemplate,
  getNormalizedInputs,
  getNormalizedDataStreams,
  filterPolicyTemplatesTiles,
} from './policy_template';

describe('isInputOnlyPolicyTemplate', () => {
  it('should return true input only policy template', () => {
    const inputOnlyPolicyTemplate: RegistryPolicyInputOnlyTemplate = {
      input: 'string',
      type: 'foo',
      name: 'bar',
      template_path: 'some/path.hbl',
      title: 'hello',
      description: 'desc',
    };
    expect(isInputOnlyPolicyTemplate(inputOnlyPolicyTemplate)).toEqual(true);
  });
  it('should return false for empty integration policy template', () => {
    const emptyIntegrationTemplate: RegistryPolicyIntegrationTemplate = {
      inputs: [],
      name: 'bar',
      title: 'hello',
      description: 'desc',
    };
    expect(isInputOnlyPolicyTemplate(emptyIntegrationTemplate)).toEqual(false);
  });
  it('should return false for integration policy template with inputs', () => {
    const integrationTemplate: RegistryPolicyIntegrationTemplate = {
      inputs: [
        {
          type: 'foo',
          title: 'myFoo',
          description: 'myFoo',
          vars: [],
        },
      ],
      name: 'bar',
      title: 'hello',
      description: 'desc',
    };
    expect(isInputOnlyPolicyTemplate(integrationTemplate)).toEqual(false);
  });
});
describe('isIntegrationPolicyTemplate', () => {
  it('should return true input only policy template', () => {
    const inputOnlyPolicyTemplate: RegistryPolicyInputOnlyTemplate = {
      input: 'string',
      type: 'foo',
      name: 'bar',
      template_path: 'some/path.hbl',
      title: 'hello',
      description: 'desc',
    };
    expect(isIntegrationPolicyTemplate(inputOnlyPolicyTemplate)).toEqual(false);
  });
  it('should return false for empty integration policy template', () => {
    const emptyIntegrationTemplate: RegistryPolicyIntegrationTemplate = {
      inputs: [],
      name: 'bar',
      title: 'hello',
      description: 'desc',
    };
    expect(isIntegrationPolicyTemplate(emptyIntegrationTemplate)).toEqual(true);
  });
  it('should return false for integration policy template with inputs', () => {
    const integrationTemplate: RegistryPolicyIntegrationTemplate = {
      inputs: [
        {
          type: 'foo',
          title: 'myFoo',
          description: 'myFoo',
          vars: [],
        },
      ],
      name: 'bar',
      title: 'hello',
      description: 'desc',
    };
    expect(isIntegrationPolicyTemplate(integrationTemplate)).toEqual(true);
  });
});

describe('getNormalizedInputs', () => {
  it('should return empty array if template has no inputs', () => {
    const emptyIntegrationTemplate: RegistryPolicyIntegrationTemplate = {
      inputs: [],
      name: 'bar',
      title: 'hello',
      description: 'desc',
    };

    expect(getNormalizedInputs(emptyIntegrationTemplate)).toEqual([]);
  });
  it('should return inputs if there are any', () => {
    const emptyIntegrationTemplate: RegistryPolicyIntegrationTemplate = {
      inputs: [
        {
          type: 'foo',
          title: 'myFoo',
          description: 'myFoo',
          vars: [],
        },
      ],
      name: 'bar',
      title: 'hello',
      description: 'desc',
    };

    expect(getNormalizedInputs(emptyIntegrationTemplate)).toEqual([
      {
        type: 'foo',
        title: 'myFoo',
        description: 'myFoo',
        vars: [],
      },
    ]);
  });
  it('should return array with one input for input only', () => {
    const inputOnlyTemplate: RegistryPolicyInputOnlyTemplate = {
      input: 'string',
      type: 'foo',
      name: 'bar',
      template_path: 'some/path.hbl',
      title: 'myFoo',
      description: 'myFoo',
    };

    expect(getNormalizedInputs(inputOnlyTemplate)).toEqual([
      {
        type: 'string',
        title: 'myFoo',
        description: 'myFoo',
      },
    ]);
  });
});

describe('getNormalizedDataStreams', () => {
  const integrationPkg: PackageInfo = {
    name: 'nginx',
    title: 'Nginx',
    version: '1.3.0',
    release: 'ga',
    description: 'Collect logs and metrics from Nginx HTTP servers with Elastic Agent.',
    format_version: '',
    owner: { github: '' },
    assets: {} as any,
    policy_templates: [],
    data_streams: [
      {
        type: 'logs',
        dataset: 'nginx.access',
        title: 'Nginx access logs',
        release: 'experimental',
        ingest_pipeline: 'default',
        streams: [
          {
            input: 'logfile',
            vars: [
              {
                name: 'paths',
                type: 'text',
                title: 'Paths',
                multi: true,
                required: true,
                show_user: true,
                default: ['/var/log/nginx/access.log*'],
              },
            ],
            template_path: 'stream.yml.hbs',
            title: 'Nginx access logs',
            description: 'Collect Nginx access logs',
            enabled: true,
          },
        ],
        package: 'nginx',
        path: 'access',
      },
    ],
    latestVersion: '1.3.0',
    keepPoliciesUpToDate: false,
    status: 'not_installed',
  };
  it('should return data_streams for integration package', () => {
    expect(getNormalizedDataStreams(integrationPkg)).toEqual(integrationPkg.data_streams);
  });
  it('should return data_streams for integration package with type specified', () => {
    expect(getNormalizedDataStreams({ ...integrationPkg, type: 'integration' })).toEqual(
      integrationPkg.data_streams
    );
  });
  it('should return data_streams for empty integration package', () => {
    expect(getNormalizedDataStreams({ ...integrationPkg, data_streams: [] })).toEqual([]);
  });
  it('should build data streams for input only package', () => {
    expect(
      getNormalizedDataStreams({
        ...integrationPkg,
        type: 'input',
        policy_templates: [
          {
            input: 'string',
            type: 'foo',
            name: 'bar',
            template_path: 'some/path.hbl',
            title: 'myFoo',
            description: 'myFoo',
            vars: [],
          },
        ],
      })
    ).toEqual([
      {
        type: 'foo',
        dataset: 'nginx.bar',
        elasticsearch: {
          dynamic_dataset: true,
          dynamic_namespace: true,
        },
        title: expect.any(String),
        release: 'ga',
        package: 'nginx',
        path: 'nginx.bar',
        streams: [
          {
            input: 'string',
            vars: expect.any(Array),
            template_path: 'some/path.hbl',
            title: 'myFoo',
            description: 'myFoo',
            enabled: true,
          },
        ],
      },
    ]);
  });
  it('should not add dataset if already present', () => {
    const datasetVar = {
      name: 'data_stream.dataset',
      type: 'text' as RegistryVarType,
      title: 'local dataset',
      description: 'some desc',
      multi: false,
      required: true,
      show_user: true,
    };
    const result = getNormalizedDataStreams({
      ...integrationPkg,
      type: 'input',
      policy_templates: [
        {
          input: 'string',
          type: 'foo',
          name: 'bar',
          template_path: 'some/path.hbl',
          title: 'myFoo',
          description: 'myFoo',
          vars: [datasetVar],
        },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].streams).toHaveLength(1);
    expect(result?.[0].streams?.[0]?.vars).toEqual([datasetVar]);
  });
});

describe('filterPolicyTemplatesTiles', () => {
  const topPackagePolicy: PackageListItem = {
    id: 'nginx',
    integration: 'nginx',
    title: 'Nginx',
    name: 'nginx',
    version: '0.0.1',
    status: 'not_installed',
    description: 'nginx',
    download: 'nginx',
    path: 'nginx',
  };

  const childPolicyTemplates: PackageListItem[] = [
    {
      id: 'nginx-template1',
      integration: 'nginx-template-1',
      title: 'Nginx Template 1',
      name: 'nginx',
      version: '0.0.1',
      status: 'not_installed',
      description: 'nginx-template-1',
      download: 'nginx-template-1',
      path: 'nginx-template-1',
    },
    {
      id: 'nginx-template2',
      integration: 'nginx-template-2',
      title: 'Nginx Template 2',
      name: 'nginx',
      version: '0.0.1',
      status: 'not_installed',
      description: 'nginx-template-2',
      download: 'nginx-template-2',
      path: 'nginx-template-2',
    },
  ];
  it('should return all tiles as undefined value', () => {
    expect(filterPolicyTemplatesTiles(undefined, topPackagePolicy, childPolicyTemplates)).toEqual([
      {
        id: 'nginx',
        integration: 'nginx',
        title: 'Nginx',
        name: 'nginx',
        version: '0.0.1',
        status: 'not_installed',
        description: 'nginx',
        download: 'nginx',
        path: 'nginx',
      },
      {
        id: 'nginx-template1',
        integration: 'nginx-template-1',
        title: 'Nginx Template 1',
        name: 'nginx',
        version: '0.0.1',
        status: 'not_installed',
        description: 'nginx-template-1',
        download: 'nginx-template-1',
        path: 'nginx-template-1',
      },
      {
        id: 'nginx-template2',
        integration: 'nginx-template-2',
        title: 'Nginx Template 2',
        name: 'nginx',
        version: '0.0.1',
        status: 'not_installed',
        description: 'nginx-template-2',
        download: 'nginx-template-2',
        path: 'nginx-template-2',
      },
    ]);
  });
  it('should return all tiles', () => {
    expect(filterPolicyTemplatesTiles('all', topPackagePolicy, childPolicyTemplates)).toEqual([
      {
        id: 'nginx',
        integration: 'nginx',
        title: 'Nginx',
        name: 'nginx',
        version: '0.0.1',
        status: 'not_installed',
        description: 'nginx',
        download: 'nginx',
        path: 'nginx',
      },
      {
        id: 'nginx-template1',
        integration: 'nginx-template-1',
        title: 'Nginx Template 1',
        name: 'nginx',
        version: '0.0.1',
        status: 'not_installed',
        description: 'nginx-template-1',
        download: 'nginx-template-1',
        path: 'nginx-template-1',
      },
      {
        id: 'nginx-template2',
        integration: 'nginx-template-2',
        title: 'Nginx Template 2',
        name: 'nginx',
        version: '0.0.1',
        status: 'not_installed',
        description: 'nginx-template-2',
        download: 'nginx-template-2',
        path: 'nginx-template-2',
      },
    ]);
  });
  it('should return just the combined policy tile', () => {
    expect(
      filterPolicyTemplatesTiles('combined_policy', topPackagePolicy, childPolicyTemplates)
    ).toEqual([
      {
        id: 'nginx',
        integration: 'nginx',
        title: 'Nginx',
        name: 'nginx',
        version: '0.0.1',
        status: 'not_installed',
        description: 'nginx',
        download: 'nginx',
        path: 'nginx',
      },
    ]);
  });
  it('should return just the individual policies (tiles)', () => {
    expect(
      filterPolicyTemplatesTiles('individual_policies', topPackagePolicy, childPolicyTemplates)
    ).toEqual([
      {
        id: 'nginx-template1',
        integration: 'nginx-template-1',
        title: 'Nginx Template 1',
        name: 'nginx',
        version: '0.0.1',
        status: 'not_installed',
        description: 'nginx-template-1',
        download: 'nginx-template-1',
        path: 'nginx-template-1',
      },
      {
        id: 'nginx-template2',
        integration: 'nginx-template-2',
        title: 'Nginx Template 2',
        name: 'nginx',
        version: '0.0.1',
        status: 'not_installed',
        description: 'nginx-template-2',
        download: 'nginx-template-2',
        path: 'nginx-template-2',
      },
    ]);
  });
});
