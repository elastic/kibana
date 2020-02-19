/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { contextMock } from './context.mock';
import { initializeEs } from './init';

jest.mock('../lib/get_current_version_as_integer', () => ({
  getCurrentVersionAsInteger: () => 1,
}));

describe('initializeEs', () => {
  let esContext = contextMock.create();

  beforeEach(() => {
    esContext = contextMock.create();
  });

  test(`should create ILM policy if it doesn't exist`, async () => {
    esContext.esAdapter.doesIlmPolicyExist.mockResolvedValue(false);

    await initializeEs(esContext);
    expect(esContext.esAdapter.doesIlmPolicyExist).toHaveBeenCalled();
    expect(esContext.esAdapter.createIlmPolicy).toHaveBeenCalled();
  });

  test(`shouldn't create ILM policy if it exists`, async () => {
    esContext.esAdapter.doesIlmPolicyExist.mockResolvedValue(true);

    await initializeEs(esContext);
    expect(esContext.esAdapter.doesIlmPolicyExist).toHaveBeenCalled();
    expect(esContext.esAdapter.createIlmPolicy).not.toHaveBeenCalled();
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

  test(`should create initial index if it doesn't exist`, async () => {
    esContext.esAdapter.doesAliasExist.mockResolvedValue(false);

    await initializeEs(esContext);
    expect(esContext.esAdapter.doesAliasExist).toHaveBeenCalled();
    expect(esContext.esAdapter.createIndex).toHaveBeenCalled();
  });

  test(`shouldn't create initial index if it already exists`, async () => {
    esContext.esAdapter.doesAliasExist.mockResolvedValue(true);

    await initializeEs(esContext);
    expect(esContext.esAdapter.doesAliasExist).toHaveBeenCalled();
    expect(esContext.esAdapter.createIndex).not.toHaveBeenCalled();
  });

  test('should migrate index template when kibana version is more recent', async () => {
    esContext.esAdapter.getIndexTemplate.mockResolvedValue({
      version: 0,
    });

    await initializeEs(esContext);
    expect(esContext.esAdapter.getIndexTemplate).toHaveBeenCalled();
    expect(esContext.esAdapter.updateIndexTemplate).toHaveBeenCalled();
    expect(esContext.esAdapter.rolloverIndex).toHaveBeenCalled();
  });

  test(`shouldn't migrate index template when kibana version is the same`, async () => {
    esContext.esAdapter.getIndexTemplate.mockResolvedValue({
      version: 1,
    });

    await initializeEs(esContext);
    expect(esContext.esAdapter.getIndexTemplate).toHaveBeenCalled();
    expect(esContext.esAdapter.updateIndexTemplate).not.toHaveBeenCalled();
    expect(esContext.esAdapter.rolloverIndex).not.toHaveBeenCalled();
  });

  test('should log error if template version in Elasticsearch is more recent', async () => {
    esContext.esAdapter.getIndexTemplate.mockResolvedValue({
      version: 2,
    });

    await initializeEs(esContext);
    expect(esContext.logger.error).toHaveBeenLastCalledWith(
      'error initializing elasticsearch resources: Index template belongs to a more recent version of Kibana (2)'
    );
  });
});
