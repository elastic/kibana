/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { contextMock } from './context.mock';
import { initializeEs } from './init';

describe('initializeEs', () => {
  let esContext = contextMock.create();

  beforeEach(() => {
    esContext = contextMock.create();
    esContext.esAdapter.doesIlmPolicyExist.mockResolvedValue({ exists: false });
  });

  test(`should create ILM policy if it doesn't exist`, async () => {
    esContext.esAdapter.doesIlmPolicyExist.mockResolvedValue({ exists: false });

    await initializeEs(esContext);
    expect(esContext.esAdapter.doesIlmPolicyExist).toHaveBeenCalled();
    expect(esContext.esAdapter.createIlmPolicy).toHaveBeenCalled();
  });

  test(`shouldn't create ILM policy if it exists`, async () => {
    esContext.esAdapter.doesIlmPolicyExist.mockResolvedValue({ exists: true, linkedIndices: [] });

    await initializeEs(esContext);
    expect(esContext.esAdapter.doesIlmPolicyExist).toHaveBeenCalled();
    expect(esContext.esAdapter.createIlmPolicy).not.toHaveBeenCalled();
    expect(esContext.esAdapter.unlinkIlmPolicyFromOutdatedIndices).not.toHaveBeenCalled();
  });

  test(`should unlink indices if ILM policy exists and is link to outdated indices`, async () => {
    esContext.esAdapter.doesIlmPolicyExist.mockResolvedValue({
      exists: true,
      linkedIndices: [
        '.kibana-event-log-8.0.0-0001',
        '.kibana-event-log-8.0.0-0002',
        '.kibana-event-log-7.14.0-0001',
        '.kibana-event-log-7.13.2-0002',
      ],
    });
    await initializeEs(esContext);
    expect(esContext.esAdapter.doesIlmPolicyExist).toHaveBeenCalled();
    expect(esContext.esAdapter.createIlmPolicy).not.toHaveBeenCalled();
    expect(esContext.esAdapter.unlinkIlmPolicyFromOutdatedIndices).toHaveBeenCalledWith([
      '.kibana-event-log-7.14.0-0001',
      '.kibana-event-log-7.13.2-0002',
    ]);
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
});
