/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { getIndexTemplate, createOrUpdateIndexTemplate } from './create_or_update_index_template';

const randomDelayMultiplier = 0.01;
const logger = loggingSystemMock.createLogger();
const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

const IndexTemplate = (namespace: string = 'default') => ({
  name: `.alerts-test.alerts-${namespace}-index-template`,
  body: {
    _meta: {
      kibana: {
        version: '8.6.1',
      },
      managed: true,
      namespace,
    },
    composed_of: ['mappings1', 'framework-mappings'],
    index_patterns: [`.internal.alerts-test.alerts-${namespace}-*`],
    template: {
      mappings: {
        _meta: {
          kibana: {
            version: '8.6.1',
          },
          managed: true,
          namespace,
        },
        dynamic: false,
      },
      settings: {
        auto_expand_replicas: '0-1',
        hidden: true,
        'index.lifecycle': {
          name: 'test-ilm-policy',
          rollover_alias: `.alerts-test.alerts-${namespace}`,
        },
        'index.mapping.total_fields.limit': 2500,
      },
    },
    priority: namespace.length,
  },
});

const SimulateTemplateResponse = {
  template: {
    aliases: {
      alias_name_1: {
        is_hidden: true,
      },
      alias_name_2: {
        is_hidden: true,
      },
    },
    mappings: { enabled: false },
    settings: {},
  },
};

describe('getIndexTemplate', () => {
  it(`should create index template with given parameters in default namespace`, () => {
    expect(
      getIndexTemplate({
        kibanaVersion: '8.6.1',
        ilmPolicyName: 'test-ilm-policy',
        indexPatterns: {
          template: '.alerts-test.alerts-default-index-template',
          pattern: '.internal.alerts-test.alerts-default-*',
          basePattern: '.alerts-test.alerts-*',
          alias: '.alerts-test.alerts-default',
          name: '.internal.alerts-test.alerts-default-000001',
        },
        namespace: 'default',
        componentTemplateRefs: ['mappings1', 'framework-mappings'],
        totalFieldsLimit: 2500,
      })
    ).toEqual(IndexTemplate());
  });

  it(`should create index template with given parameters in custom namespace`, () => {
    expect(
      getIndexTemplate({
        kibanaVersion: '8.6.1',
        ilmPolicyName: 'test-ilm-policy',
        indexPatterns: {
          template: '.alerts-test.alerts-another-space-index-template',
          pattern: '.internal.alerts-test.alerts-another-space-*',
          basePattern: '.alerts-test.alerts-*',
          alias: '.alerts-test.alerts-another-space',
          name: '.internal.alerts-test.alerts-another-space-000001',
        },
        namespace: 'another-space',
        componentTemplateRefs: ['mappings1', 'framework-mappings'],
        totalFieldsLimit: 2500,
      })
    ).toEqual(IndexTemplate('another-space'));
  });
});

describe('createOrUpdateIndexTemplate', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(global.Math, 'random').mockReturnValue(randomDelayMultiplier);
  });

  it(`should call esClient to put index template`, async () => {
    clusterClient.indices.simulateTemplate.mockImplementation(async () => SimulateTemplateResponse);
    await createOrUpdateIndexTemplate({
      logger,
      esClient: clusterClient,
      template: IndexTemplate(),
    });

    expect(clusterClient.indices.simulateTemplate).toHaveBeenCalledWith(IndexTemplate());
    expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledWith(IndexTemplate());
  });

  it(`should retry on transient ES errors`, async () => {
    clusterClient.indices.simulateTemplate.mockImplementation(async () => SimulateTemplateResponse);
    clusterClient.indices.putIndexTemplate
      .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
      .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
      .mockResolvedValue({ acknowledged: true });
    await createOrUpdateIndexTemplate({
      logger,
      esClient: clusterClient,
      template: IndexTemplate(),
    });

    expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledTimes(3);
  });

  it(`should retry simulateTemplate on transient ES errors`, async () => {
    clusterClient.indices.simulateTemplate
      .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
      .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
      .mockImplementation(async () => SimulateTemplateResponse);
    clusterClient.indices.putIndexTemplate.mockResolvedValue({ acknowledged: true });
    await createOrUpdateIndexTemplate({
      logger,
      esClient: clusterClient,
      template: IndexTemplate,
    });

    expect(clusterClient.indices.simulateTemplate).toHaveBeenCalledTimes(3);
  });

  it(`should log and throw error if max retries exceeded`, async () => {
    clusterClient.indices.simulateTemplate.mockImplementation(async () => SimulateTemplateResponse);
    clusterClient.indices.putIndexTemplate.mockRejectedValue(new EsErrors.ConnectionError('foo'));
    await expect(() =>
      createOrUpdateIndexTemplate({
        logger,
        esClient: clusterClient,
        template: IndexTemplate(),
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"foo"`);

    expect(logger.error).toHaveBeenCalledWith(
      `Error installing index template .alerts-test.alerts-default-index-template - foo`
    );
    expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledTimes(4);
  });

  it(`should log and throw error if ES throws error`, async () => {
    clusterClient.indices.simulateTemplate.mockImplementation(async () => SimulateTemplateResponse);
    clusterClient.indices.putIndexTemplate.mockRejectedValue(new Error('generic error'));

    await expect(() =>
      createOrUpdateIndexTemplate({
        logger,
        esClient: clusterClient,
        template: IndexTemplate(),
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"generic error"`);

    expect(logger.error).toHaveBeenCalledWith(
      `Error installing index template .alerts-test.alerts-default-index-template - generic error`
    );
  });

  it(`should log and return without updating template if simulate throws error`, async () => {
    clusterClient.indices.simulateTemplate.mockRejectedValue(new Error('simulate error'));
    clusterClient.indices.putIndexTemplate.mockRejectedValue(new Error('generic error'));

    await createOrUpdateIndexTemplate({
      logger,
      esClient: clusterClient,
      template: IndexTemplate(),
    });

    expect(logger.error).toHaveBeenCalledWith(
      `Failed to simulate index template mappings for .alerts-test.alerts-default-index-template; not applying mappings - simulate error`
    );
    expect(clusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it(`should throw error if simulate returns empty mappings`, async () => {
    clusterClient.indices.simulateTemplate.mockImplementationOnce(async () => ({
      ...SimulateTemplateResponse,
      template: {
        ...SimulateTemplateResponse.template,
        mappings: {},
      },
    }));

    await expect(() =>
      createOrUpdateIndexTemplate({
        logger,
        esClient: clusterClient,
        template: IndexTemplate(),
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"No mappings would be generated for .alerts-test.alerts-default-index-template, possibly due to failed/misconfigured bootstrapping"`
    );
    expect(clusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });
});
