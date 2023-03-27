/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { createConcreteWriteIndex } from './create_concrete_write_index';

const randomDelayMultiplier = 0.01;
const logger = loggingSystemMock.createLogger();
const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

interface EsError extends Error {
  statusCode?: number;
  meta?: {
    body: {
      error: {
        type: string;
      };
    };
  };
}

const GetAliasResponse = {
  real_index: {
    aliases: {
      alias_1: {
        is_hidden: true,
      },
      alias_2: {
        is_hidden: true,
      },
    },
  },
};

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

const IndexPatterns = {
  template: '.alerts-test.alerts-default-index-template',
  pattern: '.internal.alerts-test.alerts-default-*',
  basePattern: '.alerts-test.alerts-*',
  alias: '.alerts-test.alerts-default',
  name: '.internal.alerts-test.alerts-default-000001',
};

describe('createConcreteWriteIndex', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(global.Math, 'random').mockReturnValue(randomDelayMultiplier);
  });

  it(`should call esClient to put index template`, async () => {
    clusterClient.indices.getAlias.mockImplementation(async () => ({}));
    await createConcreteWriteIndex({
      logger,
      esClient: clusterClient,
      indexPatterns: IndexPatterns,
      totalFieldsLimit: 2500,
    });

    expect(clusterClient.indices.create).toHaveBeenCalledWith({
      index: '.internal.alerts-test.alerts-default-000001',
      body: {
        aliases: {
          '.alerts-test.alerts-default': {
            is_write_index: true,
          },
        },
      },
    });
  });

  it(`should retry on transient ES errors`, async () => {
    clusterClient.indices.getAlias.mockImplementation(async () => ({}));
    clusterClient.indices.create
      .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
      .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
      .mockResolvedValue({
        index: '.internal.alerts-test.alerts-default-000001',
        shards_acknowledged: true,
        acknowledged: true,
      });
    await createConcreteWriteIndex({
      logger,
      esClient: clusterClient,
      indexPatterns: IndexPatterns,
      totalFieldsLimit: 2500,
    });

    expect(clusterClient.indices.create).toHaveBeenCalledTimes(3);
  });

  it(`should log and throw error if max retries exceeded`, async () => {
    clusterClient.indices.getAlias.mockImplementation(async () => ({}));
    clusterClient.indices.create.mockRejectedValue(new EsErrors.ConnectionError('foo'));
    await expect(() =>
      createConcreteWriteIndex({
        logger,
        esClient: clusterClient,
        indexPatterns: IndexPatterns,
        totalFieldsLimit: 2500,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"foo"`);

    expect(logger.error).toHaveBeenCalledWith(`Error creating concrete write index - foo`);
    expect(clusterClient.indices.create).toHaveBeenCalledTimes(4);
  });

  it(`should log and throw error if ES throws error`, async () => {
    clusterClient.indices.getAlias.mockImplementation(async () => ({}));
    clusterClient.indices.create.mockRejectedValueOnce(new Error('generic error'));

    await expect(() =>
      createConcreteWriteIndex({
        logger,
        esClient: clusterClient,
        indexPatterns: IndexPatterns,
        totalFieldsLimit: 2500,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"generic error"`);

    expect(logger.error).toHaveBeenCalledWith(
      `Error creating concrete write index - generic error`
    );
  });

  it(`should log and return if ES throws resource_already_exists_exception error and existing index is already write index`, async () => {
    clusterClient.indices.getAlias.mockImplementation(async () => ({}));
    const error = new Error(`fail`) as EsError;
    error.meta = {
      body: {
        error: {
          type: 'resource_already_exists_exception',
        },
      },
    };
    clusterClient.indices.create.mockRejectedValueOnce(error);
    clusterClient.indices.get.mockImplementationOnce(async () => ({
      '.internal.alerts-test.alerts-default-000001': {
        aliases: { '.alerts-test.alerts-default': { is_write_index: true } },
      },
    }));

    await createConcreteWriteIndex({
      logger,
      esClient: clusterClient,
      indexPatterns: IndexPatterns,
      totalFieldsLimit: 2500,
    });

    expect(logger.error).toHaveBeenCalledWith(`Error creating concrete write index - fail`);
  });

  it(`should log and throw error if ES throws resource_already_exists_exception error and existing index is not the write index`, async () => {
    clusterClient.indices.getAlias.mockImplementation(async () => ({}));
    const error = new Error(`fail`) as EsError;
    error.meta = {
      body: {
        error: {
          type: 'resource_already_exists_exception',
        },
      },
    };
    clusterClient.indices.create.mockRejectedValueOnce(error);
    clusterClient.indices.get.mockImplementationOnce(async () => ({
      '.internal.alerts-test.alerts-default-000001': {
        aliases: { '.alerts-test.alerts-default': { is_write_index: false } },
      },
    }));

    await expect(() =>
      createConcreteWriteIndex({
        logger,
        esClient: clusterClient,
        indexPatterns: IndexPatterns,
        totalFieldsLimit: 2500,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Attempted to create index: .internal.alerts-test.alerts-default-000001 as the write index for alias: .alerts-test.alerts-default, but the index already exists and is not the write index for the alias"`
    );
    expect(logger.error).toHaveBeenCalledWith(`Error creating concrete write index - fail`);
  });

  it(`should call esClient to put index template if get alias throws 404`, async () => {
    const error = new Error(`not found`) as EsError;
    error.statusCode = 404;
    clusterClient.indices.getAlias.mockRejectedValueOnce(error);
    await createConcreteWriteIndex({
      logger,
      esClient: clusterClient,
      indexPatterns: IndexPatterns,
      totalFieldsLimit: 2500,
    });

    expect(clusterClient.indices.create).toHaveBeenCalledWith({
      index: '.internal.alerts-test.alerts-default-000001',
      body: {
        aliases: {
          '.alerts-test.alerts-default': {
            is_write_index: true,
          },
        },
      },
    });
  });

  it(`should log and throw error if get alias throws non-404 error`, async () => {
    const error = new Error(`fatal error`) as EsError;
    error.statusCode = 500;
    clusterClient.indices.getAlias.mockRejectedValueOnce(error);

    await expect(() =>
      createConcreteWriteIndex({
        logger,
        esClient: clusterClient,
        indexPatterns: IndexPatterns,
        totalFieldsLimit: 2500,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"fatal error"`);
    expect(logger.error).toHaveBeenCalledWith(
      `Error fetching concrete indices for .internal.alerts-test.alerts-default-* pattern - fatal error`
    );
  });

  it(`should update underlying settings and mappings of existing concrete indices if they exist`, async () => {
    clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
    clusterClient.indices.simulateIndexTemplate.mockImplementation(
      async () => SimulateTemplateResponse
    );
    await createConcreteWriteIndex({
      logger,
      esClient: clusterClient,
      indexPatterns: IndexPatterns,
      totalFieldsLimit: 2500,
    });

    expect(clusterClient.indices.create).toHaveBeenCalledWith({
      index: '.internal.alerts-test.alerts-default-000001',
      body: {
        aliases: {
          '.alerts-test.alerts-default': {
            is_write_index: true,
          },
        },
      },
    });

    expect(clusterClient.indices.putSettings).toHaveBeenCalledTimes(2);
    expect(clusterClient.indices.putMapping).toHaveBeenCalledTimes(2);
  });

  it(`should retry settings update on transient ES errors`, async () => {
    clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
    clusterClient.indices.simulateIndexTemplate.mockImplementation(
      async () => SimulateTemplateResponse
    );
    clusterClient.indices.putSettings
      .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
      .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
      .mockResolvedValue({ acknowledged: true });

    await createConcreteWriteIndex({
      logger,
      esClient: clusterClient,
      indexPatterns: IndexPatterns,
      totalFieldsLimit: 2500,
    });

    expect(clusterClient.indices.putSettings).toHaveBeenCalledTimes(4);
  });

  it(`should log and throw error on settings update if max retries exceeded`, async () => {
    clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
    clusterClient.indices.simulateIndexTemplate.mockImplementation(
      async () => SimulateTemplateResponse
    );
    clusterClient.indices.putSettings.mockRejectedValue(new EsErrors.ConnectionError('foo'));
    await expect(() =>
      createConcreteWriteIndex({
        logger,
        esClient: clusterClient,
        indexPatterns: IndexPatterns,
        totalFieldsLimit: 2500,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"foo"`);
    expect(clusterClient.indices.putSettings).toHaveBeenCalledTimes(7);
    expect(logger.error).toHaveBeenCalledWith(
      `Failed to PUT index.mapping.total_fields.limit settings for alias alias_1: foo`
    );
  });

  it(`should log and throw error on settings update if ES throws error`, async () => {
    clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
    clusterClient.indices.simulateIndexTemplate.mockImplementation(
      async () => SimulateTemplateResponse
    );
    clusterClient.indices.putSettings.mockRejectedValue(new Error('generic error'));

    await expect(() =>
      createConcreteWriteIndex({
        logger,
        esClient: clusterClient,
        indexPatterns: IndexPatterns,
        totalFieldsLimit: 2500,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"generic error"`);

    expect(logger.error).toHaveBeenCalledWith(
      `Failed to PUT index.mapping.total_fields.limit settings for alias alias_1: generic error`
    );
  });

  it(`should retry mappings update on transient ES errors`, async () => {
    clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
    clusterClient.indices.simulateIndexTemplate.mockImplementation(
      async () => SimulateTemplateResponse
    );
    clusterClient.indices.putMapping
      .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
      .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
      .mockResolvedValue({ acknowledged: true });

    await createConcreteWriteIndex({
      logger,
      esClient: clusterClient,
      indexPatterns: IndexPatterns,
      totalFieldsLimit: 2500,
    });

    expect(clusterClient.indices.putMapping).toHaveBeenCalledTimes(4);
  });

  it(`should log and throw error on mappings update if max retries exceeded`, async () => {
    clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
    clusterClient.indices.simulateIndexTemplate.mockImplementation(
      async () => SimulateTemplateResponse
    );
    clusterClient.indices.putMapping.mockRejectedValue(new EsErrors.ConnectionError('foo'));
    await expect(() =>
      createConcreteWriteIndex({
        logger,
        esClient: clusterClient,
        indexPatterns: IndexPatterns,
        totalFieldsLimit: 2500,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"foo"`);
    expect(clusterClient.indices.putMapping).toHaveBeenCalledTimes(7);
    expect(logger.error).toHaveBeenCalledWith(`Failed to PUT mapping for alias alias_1: foo`);
  });

  it(`should log and throw error on mappings update if ES throws error`, async () => {
    clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
    clusterClient.indices.simulateIndexTemplate.mockImplementation(
      async () => SimulateTemplateResponse
    );
    clusterClient.indices.putMapping.mockRejectedValue(new Error('generic error'));

    await expect(() =>
      createConcreteWriteIndex({
        logger,
        esClient: clusterClient,
        indexPatterns: IndexPatterns,
        totalFieldsLimit: 2500,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"generic error"`);

    expect(logger.error).toHaveBeenCalledWith(
      `Failed to PUT mapping for alias alias_1: generic error`
    );
  });

  it(`should log and return when simulating updated mappings throws error`, async () => {
    clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
    clusterClient.indices.simulateIndexTemplate.mockRejectedValueOnce(new Error('fail'));

    await createConcreteWriteIndex({
      logger,
      esClient: clusterClient,
      indexPatterns: IndexPatterns,
      totalFieldsLimit: 2500,
    });

    expect(logger.error).toHaveBeenCalledWith(
      `Ignored PUT mappings for alias alias_1; error generating simulated mappings: fail`
    );

    expect(clusterClient.indices.create).toHaveBeenCalledWith({
      index: '.internal.alerts-test.alerts-default-000001',
      body: {
        aliases: {
          '.alerts-test.alerts-default': {
            is_write_index: true,
          },
        },
      },
    });
  });

  it(`should log and return when simulating updated mappings returns null`, async () => {
    clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
    clusterClient.indices.simulateIndexTemplate.mockImplementationOnce(async () => ({
      ...SimulateTemplateResponse,
      template: { ...SimulateTemplateResponse.template, mappings: null },
    }));

    await createConcreteWriteIndex({
      logger,
      esClient: clusterClient,
      indexPatterns: IndexPatterns,
      totalFieldsLimit: 2500,
    });

    expect(logger.error).toHaveBeenCalledWith(
      `Ignored PUT mappings for alias alias_1; simulated mappings were empty`
    );

    expect(clusterClient.indices.create).toHaveBeenCalledWith({
      index: '.internal.alerts-test.alerts-default-000001',
      body: {
        aliases: {
          '.alerts-test.alerts-default': {
            is_write_index: true,
          },
        },
      },
    });
  });

  it(`should throw error when there are concrete indices but none of them are the write index`, async () => {
    clusterClient.indices.getAlias.mockImplementationOnce(async () => ({
      '.internal.alerts-test.alerts-default-0001': {
        aliases: {
          '.alerts-test.alerts-default': {
            is_write_index: false,
            is_hidden: true,
          },
          alias_2: {
            is_write_index: false,
            is_hidden: true,
          },
        },
      },
    }));
    clusterClient.indices.simulateIndexTemplate.mockImplementation(
      async () => SimulateTemplateResponse
    );

    await expect(() =>
      createConcreteWriteIndex({
        logger,
        esClient: clusterClient,
        indexPatterns: IndexPatterns,
        totalFieldsLimit: 2500,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Indices matching pattern .internal.alerts-test.alerts-default-* exist but none are set as the write index for alias .alerts-test.alerts-default"`
    );
  });
});
