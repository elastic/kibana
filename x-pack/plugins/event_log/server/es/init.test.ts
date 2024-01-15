/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { contextMock, MOCK_RETRY_DELAY } from './context.mock';
import { initializeEs, parseIndexAliases } from './init';

describe('initializeEs', () => {
  let esContext = contextMock.create();

  beforeEach(() => {
    esContext = contextMock.create();
    esContext.esAdapter.getExistingLegacyIndexTemplates.mockResolvedValue({});
    esContext.esAdapter.getExistingIndices.mockResolvedValue({});
    esContext.esAdapter.getExistingIndexAliases.mockResolvedValue({});
  });

  test(`should update existing index templates if any exist and are not hidden`, async () => {
    const testTemplate = {
      order: 0,
      index_patterns: ['foo-bar-*'],
      settings: {
        index: {
          lifecycle: {
            name: 'foo-bar-policy',
            rollover_alias: 'foo-bar-1',
          },
          number_of_shards: '1',
          auto_expand_replicas: '0-1',
        },
      },
      mappings: {},
      aliases: {},
    };
    esContext.esAdapter.getExistingLegacyIndexTemplates.mockResolvedValue({
      'foo-bar-template': testTemplate,
    });

    await initializeEs(esContext);
    expect(esContext.esAdapter.getExistingLegacyIndexTemplates).toHaveBeenCalled();
    expect(esContext.esAdapter.setLegacyIndexTemplateToHidden).toHaveBeenCalledWith(
      'foo-bar-template',
      testTemplate
    );
  });

  test(`should not update existing index templates if any exist and are already hidden`, async () => {
    const testTemplate = {
      order: 0,
      index_patterns: ['foo-bar-*'],
      settings: {
        index: {
          lifecycle: {
            name: 'foo-bar-policy',
            rollover_alias: 'foo-bar-1',
          },
          hidden: 'true',
          number_of_shards: '1',
          auto_expand_replicas: '0-1',
        },
      },
      mappings: {},
      aliases: {},
    };
    esContext.esAdapter.getExistingLegacyIndexTemplates.mockResolvedValue({
      'foo-bar-template': testTemplate,
    });

    await initializeEs(esContext);
    expect(esContext.esAdapter.getExistingLegacyIndexTemplates).toHaveBeenCalled();
    expect(esContext.esAdapter.setLegacyIndexTemplateToHidden).not.toHaveBeenCalled();
  });

  test(`should not read or update existing index templates when specifying shouldSetExistingAssetsToHidden=false`, async () => {
    await initializeEs({ ...esContext, shouldSetExistingAssetsToHidden: false });
    expect(esContext.esAdapter.getExistingLegacyIndexTemplates).not.toHaveBeenCalled();
    expect(esContext.esAdapter.setLegacyIndexTemplateToHidden).not.toHaveBeenCalled();
  });

  test(`should continue initialization if getting existing index templates throws an error`, async () => {
    esContext.esAdapter.getExistingLegacyIndexTemplates.mockRejectedValue(new Error('Fail'));

    await initializeEs(esContext);
    expect(esContext.esAdapter.getExistingLegacyIndexTemplates).toHaveBeenCalled();
    expect(esContext.logger.error).toHaveBeenCalledWith(
      `error getting existing index templates - Fail`
    );
    expect(esContext.esAdapter.setLegacyIndexTemplateToHidden).not.toHaveBeenCalled();
  });

  test(`should continue initialization if updating existing index templates throws an error`, async () => {
    const testTemplate = {
      order: 0,
      index_patterns: ['foo-bar-*'],
      settings: {
        index: {
          lifecycle: {
            name: 'foo-bar-policy',
            rollover_alias: 'foo-bar-1',
          },
          number_of_shards: '1',
          auto_expand_replicas: '0-1',
        },
      },
      mappings: {},
      aliases: {},
    };
    esContext.esAdapter.getExistingLegacyIndexTemplates.mockResolvedValue({
      'foo-bar-template': testTemplate,
      'another-test-template': testTemplate,
    });
    esContext.esAdapter.setLegacyIndexTemplateToHidden.mockRejectedValueOnce(new Error('Fail'));
    esContext.esAdapter.setLegacyIndexTemplateToHidden.mockResolvedValueOnce();

    await initializeEs(esContext);
    expect(esContext.esAdapter.getExistingLegacyIndexTemplates).toHaveBeenCalled();
    expect(esContext.esAdapter.setLegacyIndexTemplateToHidden).toHaveBeenCalledWith(
      'foo-bar-template',
      testTemplate
    );
    expect(esContext.esAdapter.setLegacyIndexTemplateToHidden).toHaveBeenCalledWith(
      'another-test-template',
      testTemplate
    );
    expect(esContext.logger.error).toHaveBeenCalledTimes(1);
    expect(esContext.logger.error).toHaveBeenCalledWith(
      `error setting existing \"foo-bar-template\" index template to hidden - Fail`
    );
  });

  test(`should update existing index settings if any exist and are not hidden`, async () => {
    const testSettings = {
      settings: {
        index: {
          lifecycle: {
            name: 'foo-bar-policy',
            rollover_alias: 'foo-bar-1',
          },
          routing: {
            allocation: {
              include: {
                _tier_preference: 'data_content',
              },
            },
          },
          number_of_shards: '1',
          auto_expand_replicas: '0-1',
          provided_name: '.kibana-event-log-7.15.0-000001',
          creation_date: '1630439186791',
          number_of_replicas: '0',
          uuid: 'Ure4d9edQbCMtcmyy0ObrA',
          version: {
            created: '7150099',
          },
        },
      },
    };
    esContext.esAdapter.getExistingIndices.mockResolvedValue({
      'foo-bar-000001': testSettings,
    });

    await initializeEs(esContext);
    expect(esContext.esAdapter.getExistingIndices).toHaveBeenCalled();
    expect(esContext.esAdapter.setIndexToHidden).toHaveBeenCalledWith('foo-bar-000001');
  });

  test(`should not update existing index settings if any exist and are already hidden`, async () => {
    const testSettings = {
      settings: {
        index: {
          lifecycle: {
            name: 'foo-bar-policy',
            rollover_alias: 'foo-bar-1',
          },
          routing: {
            allocation: {
              include: {
                _tier_preference: 'data_content',
              },
            },
          },
          hidden: 'true',
          number_of_shards: '1',
          auto_expand_replicas: '0-1',
          provided_name: '.kibana-event-log-7.15.0-000001',
          creation_date: '1630439186791',
          number_of_replicas: '0',
          uuid: 'Ure4d9edQbCMtcmyy0ObrA',
          version: {
            created: '7150099',
          },
        },
      },
    };
    esContext.esAdapter.getExistingIndices.mockResolvedValue({
      'foo-bar-000001': testSettings,
    });

    await initializeEs(esContext);
    expect(esContext.esAdapter.getExistingIndices).toHaveBeenCalled();
    expect(esContext.esAdapter.setIndexToHidden).not.toHaveBeenCalled();
  });

  test(`should not read or update existing index settings when specifying shouldSetExistingAssetsToHidden=false`, async () => {
    await initializeEs({ ...esContext, shouldSetExistingAssetsToHidden: false });
    expect(esContext.esAdapter.getExistingIndices).not.toHaveBeenCalled();
    expect(esContext.esAdapter.setIndexToHidden).not.toHaveBeenCalled();
  });

  test(`should continue initialization if getting existing index settings throws an error`, async () => {
    esContext.esAdapter.getExistingIndices.mockRejectedValue(new Error('Fail'));

    await initializeEs(esContext);
    expect(esContext.esAdapter.getExistingIndices).toHaveBeenCalled();
    expect(esContext.logger.error).toHaveBeenCalledWith(`error getting existing indices - Fail`);
    expect(esContext.esAdapter.setIndexToHidden).not.toHaveBeenCalled();
  });

  test(`should continue initialization if updating existing index settings throws an error`, async () => {
    const testSettings = {
      settings: {
        index: {
          lifecycle: {
            name: 'foo-bar-policy',
            rollover_alias: 'foo-bar-1',
          },
          routing: {
            allocation: {
              include: {
                _tier_preference: 'data_content',
              },
            },
          },
          number_of_shards: '1',
          auto_expand_replicas: '0-1',
          provided_name: '.kibana-event-log-7.15.0-000001',
          creation_date: '1630439186791',
          number_of_replicas: '0',
          uuid: 'Ure4d9edQbCMtcmyy0ObrA',
          version: {
            created: '7150099',
          },
        },
      },
    };
    esContext.esAdapter.getExistingIndices.mockResolvedValue({
      'foo-bar-000001': testSettings,
      'foo-bar-000002': testSettings,
    });

    esContext.esAdapter.setIndexToHidden.mockRejectedValueOnce(new Error('Fail'));
    esContext.esAdapter.setIndexToHidden.mockResolvedValueOnce();

    await initializeEs(esContext);
    expect(esContext.esAdapter.getExistingIndices).toHaveBeenCalled();
    expect(esContext.logger.error).toHaveBeenCalledTimes(1);
    expect(esContext.logger.error).toHaveBeenCalledWith(
      `error setting existing \"foo-bar-000001\" index to hidden - Fail`
    );
  });

  test(`should update existing index aliases if any exist and are not hidden`, async () => {
    const testAliases = {
      aliases: {
        'foo-bar': {
          is_write_index: true,
        },
      },
    };
    esContext.esAdapter.getExistingIndexAliases.mockResolvedValue({
      'foo-bar-000001': testAliases,
    });

    await initializeEs(esContext);
    expect(esContext.esAdapter.getExistingIndexAliases).toHaveBeenCalledTimes(1);
    expect(esContext.esAdapter.setIndexAliasToHidden).toHaveBeenCalledWith('foo-bar', [
      { alias: 'foo-bar', indexName: 'foo-bar-000001', is_write_index: true },
    ]);
  });

  test(`should not update existing index aliases if any exist and are already hidden`, async () => {
    const testAliases = {
      aliases: {
        'foo-bar': {
          is_write_index: true,
          is_hidden: true,
        },
      },
    };
    esContext.esAdapter.getExistingIndexAliases.mockResolvedValue({
      'foo-bar-000001': testAliases,
    });

    await initializeEs(esContext);
    expect(esContext.esAdapter.getExistingIndexAliases).toHaveBeenCalled();
    expect(esContext.esAdapter.setIndexAliasToHidden).not.toHaveBeenCalled();
  });

  test(`should not read or update existing index aliases when specifying shouldSetExistingAssetsToHidden=false`, async () => {
    await initializeEs({ ...esContext, shouldSetExistingAssetsToHidden: false });
    expect(esContext.esAdapter.getExistingIndexAliases).not.toHaveBeenCalled();
    expect(esContext.esAdapter.setIndexAliasToHidden).not.toHaveBeenCalled();
  });

  test(`should continue initialization if getting existing index aliases throws an error`, async () => {
    esContext.esAdapter.getExistingIndexAliases.mockRejectedValue(new Error('Fail'));

    await initializeEs(esContext);
    expect(esContext.esAdapter.getExistingIndexAliases).toHaveBeenCalled();
    expect(esContext.logger.error).toHaveBeenCalledWith(
      `error getting existing index aliases - Fail`
    );
    expect(esContext.esAdapter.setIndexAliasToHidden).not.toHaveBeenCalled();
  });

  test(`should continue initialization if updating existing index aliases throws an error`, async () => {
    const testAliases = {
      aliases: {
        'foo-bar': {
          is_write_index: true,
        },
        'bar-foo': {
          is_write_index: true,
        },
      },
    };
    esContext.esAdapter.getExistingIndexAliases.mockResolvedValue({
      'foo-bar-000001': testAliases,
      'foo-bar-000002': testAliases,
    });
    esContext.esAdapter.setIndexAliasToHidden.mockRejectedValueOnce(new Error('Fail'));
    esContext.esAdapter.setIndexAliasToHidden.mockResolvedValueOnce();

    await initializeEs(esContext);
    expect(esContext.esAdapter.getExistingIndexAliases).toHaveBeenCalled();
    expect(esContext.esAdapter.setIndexAliasToHidden).toHaveBeenCalledTimes(2);
    expect(esContext.esAdapter.setIndexAliasToHidden).toHaveBeenCalledWith('foo-bar', [
      { alias: 'foo-bar', indexName: 'foo-bar-000001', is_write_index: true },
      { alias: 'foo-bar', indexName: 'foo-bar-000002', is_write_index: true },
    ]);
    expect(esContext.esAdapter.setIndexAliasToHidden).toHaveBeenCalledWith('bar-foo', [
      { alias: 'bar-foo', indexName: 'foo-bar-000001', is_write_index: true },
      { alias: 'bar-foo', indexName: 'foo-bar-000002', is_write_index: true },
    ]);
    expect(esContext.logger.error).toHaveBeenCalledTimes(1);
    expect(esContext.logger.error).toHaveBeenCalledWith(
      `error setting existing \"foo-bar\" index aliases - Fail`
    );
  });

  test(`should create index template if it doesn't exist`, async () => {
    esContext.esAdapter.doesIndexTemplateExist.mockResolvedValue(false);

    await initializeEs(esContext);
    expect(esContext.esAdapter.doesIndexTemplateExist).toHaveBeenCalled();
    expect(esContext.esAdapter.createIndexTemplate).toHaveBeenCalled();
  });

  test(`shouldn't create index template if it already exists`, async () => {
    esContext.esAdapter.doesIndexTemplateExist.mockResolvedValue(true);

    await initializeEs(esContext);
    expect(esContext.esAdapter.doesIndexTemplateExist).toHaveBeenCalled();
    expect(esContext.esAdapter.createIndexTemplate).not.toHaveBeenCalled();
  });

  test(`should create data stream if it doesn't exist`, async () => {
    esContext.esAdapter.doesDataStreamExist.mockResolvedValue(false);

    await initializeEs(esContext);
    expect(esContext.esAdapter.doesDataStreamExist).toHaveBeenCalled();
    expect(esContext.esAdapter.createDataStream).toHaveBeenCalled();
  });

  test(`shouldn't create data stream if it already exists`, async () => {
    esContext.esAdapter.doesDataStreamExist.mockResolvedValue(true);

    await initializeEs(esContext);
    expect(esContext.esAdapter.doesDataStreamExist).toHaveBeenCalled();
    expect(esContext.esAdapter.createDataStream).not.toHaveBeenCalled();
  });
});

describe('parseIndexAliases', () => {
  test('should parse IndicesGetAliasResponse into desired format', () => {
    const indexGetAliasResponse = {
      '.kibana-event-log-7.15.2-000003': {
        aliases: {
          '.kibana-event-log-7.15.2': {
            is_write_index: true,
          },
          another_alias: {
            is_write_index: true,
          },
        },
      },
      '.kibana-event-log-7.15.2-000002': {
        aliases: {
          '.kibana-event-log-7.15.2': {
            is_write_index: false,
          },
        },
      },
      '.kibana-event-log-7.15.2-000001': {
        aliases: {
          '.kibana-event-log-7.15.2': {
            is_write_index: false,
          },
        },
      },
      '.kibana-event-log-8.0.0-000001': {
        aliases: {
          '.kibana-event-log-8.0.0': {
            is_write_index: true,
            is_hidden: true,
          },
        },
      },
    };
    expect(parseIndexAliases(indexGetAliasResponse)).toEqual([
      {
        alias: '.kibana-event-log-7.15.2',
        indexName: '.kibana-event-log-7.15.2-000003',
        is_write_index: true,
      },
      {
        alias: 'another_alias',
        indexName: '.kibana-event-log-7.15.2-000003',
        is_write_index: true,
      },
      {
        alias: '.kibana-event-log-7.15.2',
        indexName: '.kibana-event-log-7.15.2-000002',
        is_write_index: false,
      },
      {
        alias: '.kibana-event-log-7.15.2',
        indexName: '.kibana-event-log-7.15.2-000001',
        is_write_index: false,
      },
      {
        alias: '.kibana-event-log-8.0.0',
        indexName: '.kibana-event-log-8.0.0-000001',
        is_hidden: true,
        is_write_index: true,
      },
    ]);
  });
});

describe('retries', () => {
  let esContext = contextMock.create();
  // set up context APIs to return defaults indicating already created
  beforeEach(() => {
    esContext = contextMock.create();
    esContext.esAdapter.getExistingLegacyIndexTemplates.mockResolvedValue({});
    esContext.esAdapter.getExistingIndices.mockResolvedValue({});
    esContext.esAdapter.getExistingIndexAliases.mockResolvedValue({});
    esContext.esAdapter.doesIndexTemplateExist.mockResolvedValue(true);
    esContext.esAdapter.doesDataStreamExist.mockResolvedValue(true);
  });

  test('createIndexTemplateIfNotExists with 2 retries', async () => {
    esContext.esAdapter.doesIndexTemplateExist.mockRejectedValueOnce(new Error('retry 2a'));
    esContext.esAdapter.doesIndexTemplateExist.mockRejectedValueOnce(new Error('retry 2b'));

    const timeStart = performance.now();
    await initializeEs(esContext);
    const timeElapsed = performance.now() - timeStart;

    expect(timeElapsed).toBeGreaterThanOrEqual(MOCK_RETRY_DELAY * (1 + 2));

    expect(esContext.esAdapter.getExistingLegacyIndexTemplates).toHaveBeenCalledTimes(1);
    expect(esContext.esAdapter.doesIndexTemplateExist).toHaveBeenCalledTimes(3);
    expect(esContext.esAdapter.doesDataStreamExist).toHaveBeenCalledTimes(1);

    const prefix = `eventLog initialization operation failed and will be retried: createIndexTemplateIfNotExists`;
    expect(esContext.logger.warn).toHaveBeenCalledTimes(2);
    expect(esContext.logger.warn).toHaveBeenCalledWith(`${prefix}; 4 more times; error: retry 2a`);
    expect(esContext.logger.warn).toHaveBeenCalledWith(`${prefix}; 3 more times; error: retry 2b`);
  });

  test('createDataStreamIfNotExists retry error', async () => {
    esContext.esAdapter.doesDataStreamExist.mockRejectedValueOnce(new Error('retry 5a'));
    esContext.esAdapter.doesDataStreamExist.mockRejectedValueOnce(new Error('retry 5b'));
    esContext.esAdapter.doesDataStreamExist.mockRejectedValueOnce(new Error('retry 5c'));
    esContext.esAdapter.doesDataStreamExist.mockRejectedValueOnce(new Error('retry 5d'));
    esContext.esAdapter.doesDataStreamExist.mockRejectedValueOnce(new Error('retry 5e'));
    // make sure it only tries 5 times - this one should not be reported
    esContext.esAdapter.doesDataStreamExist.mockRejectedValueOnce(new Error('retry 5f'));

    const timeStart = performance.now();
    await initializeEs(esContext);
    const timeElapsed = performance.now() - timeStart;

    expect(timeElapsed).toBeGreaterThanOrEqual(MOCK_RETRY_DELAY * (1 + 2 + 4 + 8));

    expect(esContext.esAdapter.getExistingLegacyIndexTemplates).toHaveBeenCalledTimes(1);
    expect(esContext.esAdapter.doesIndexTemplateExist).toHaveBeenCalledTimes(1);
    expect(esContext.esAdapter.doesDataStreamExist).toHaveBeenCalledTimes(5);
    expect(esContext.esAdapter.createDataStream).toHaveBeenCalledTimes(0);

    const prefix = `eventLog initialization operation failed and will be retried: createDataStreamIfNotExists`;
    expect(esContext.logger.warn).toHaveBeenCalledTimes(5);
    expect(esContext.logger.warn).toHaveBeenCalledWith(`${prefix}; 4 more times; error: retry 5a`);
    expect(esContext.logger.warn).toHaveBeenCalledWith(`${prefix}; 3 more times; error: retry 5b`);
    expect(esContext.logger.warn).toHaveBeenCalledWith(`${prefix}; 2 more times; error: retry 5c`);
    expect(esContext.logger.warn).toHaveBeenCalledWith(`${prefix}; 1 more times; error: retry 5d`);
    expect(esContext.logger.warn).toHaveBeenCalledWith(`${prefix}; 0 more times; error: retry 5e`);

    expect(esContext.logger.error).toHaveBeenCalledTimes(1);
    expect(esContext.logger.error).toHaveBeenCalledWith(
      `error initializing elasticsearch resources: retry 5e`
    );
  });
});
