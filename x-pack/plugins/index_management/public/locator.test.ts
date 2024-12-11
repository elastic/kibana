/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { ManagementAppLocatorDefinition } from '@kbn/management-plugin/common/locator';
import { IndexManagementLocatorDefinition, INDEX_MANAGEMENT_LOCATOR_ID } from './locator';

describe('Index Management URL locator', () => {
  let locator: IndexManagementLocatorDefinition;

  beforeEach(() => {
    const managementDefinition = new ManagementAppLocatorDefinition();

    locator = new IndexManagementLocatorDefinition({
      managementAppLocator: {
        ...sharePluginMock.createLocator(),
        getLocation: (params) => managementDefinition.getLocation(params),
      },
    });
  });

  test('locator has the right ID', () => {
    expect(locator.id).toBe(INDEX_MANAGEMENT_LOCATOR_ID);
  });

  test('locator returns the correct url for data streams details', async () => {
    const { path } = await locator.getLocation({
      page: 'data_streams_details',
      dataStreamName: 'test',
    });
    expect(path).toBe('/data/index_management/data_streams/test');
  });

  test('locator returns the correct url for index_template', async () => {
    const indexTemplateName = 'test@custom';
    const { path } = await locator.getLocation({
      page: 'index_template',
      indexTemplate: indexTemplateName,
    });
    expect(path).toBe(
      encodeURI(`/data/index_management/templates/${encodeURIComponent(indexTemplateName)}`)
    );
  });

  test('locator returns the correct url for component_template', async () => {
    const componentTemplateName = 'log@custom';
    const { path } = await locator.getLocation({
      page: 'component_template',
      componentTemplate: componentTemplateName,
    });
    expect(path).toBe(
      `/data/index_management/component_templates/${encodeURIComponent(componentTemplateName)}`
    );
  });
});
