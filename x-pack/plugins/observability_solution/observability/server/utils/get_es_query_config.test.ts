/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { getEsQueryConfig } from './get_es_query_config';

describe('getEsQueryConfig', () => {
  const uiSettingsClient = uiSettingsServiceMock.createClient();

  it('should get the es query config correctly', async () => {
    const settings = await getEsQueryConfig(uiSettingsClient);

    expect(settings).toEqual({
      allowLeadingWildcards: false,
      ignoreFilterIfFieldNotInIndex: false,
      queryStringOptions: false,
    });
  });
});
