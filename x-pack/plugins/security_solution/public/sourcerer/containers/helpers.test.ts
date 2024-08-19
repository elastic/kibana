/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLAdHocDataview } from '@kbn/esql-utils';
import type { PluginStartDependencies } from '@kbn/security-plugin/public/plugin';
import { getESQLAdHocDataViewForSecuritySolution } from './helpers';

jest.mock('@kbn/esql-utils');

const mockDataViewWithTimestamp = {
  fields: {
    getByName: jest.fn().mockReturnValue({ type: 'date' }),
  },
};

const mockDataViewWithoutTimeStamp = {
  fields: {
    getByName: jest.fn().mockReturnValue(undefined),
  },
};

const mockDataViewsService: PluginStartDependencies['dataViews'] =
  {} as unknown as PluginStartDependencies['dataViews'];

const indexPattern = 'indexPattern';

describe('getESQLDataViewForSecuritySolution', () => {
  beforeEach(() => {
    (getESQLAdHocDataview as jest.Mock).mockResolvedValue(mockDataViewWithTimestamp);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return dataViewObj with timeFieldName populated', async () => {
    const result = await getESQLAdHocDataViewForSecuritySolution({
      dataViews: mockDataViewsService as unknown as PluginStartDependencies['dataViews'],
      indexPattern,
    });

    expect(result).toHaveProperty('timeFieldName');
    expect(result?.timeFieldName).toBe('@timestamp');
  });

  test('should return dataViewObj without timeFieldName populated', async () => {
    (getESQLAdHocDataview as jest.Mock).mockResolvedValue(mockDataViewWithoutTimeStamp);
    const result = await getESQLAdHocDataViewForSecuritySolution({
      dataViews: mockDataViewsService,
      indexPattern,
    });

    expect(result).not.toHaveProperty('timeFieldName');
  });

  test('should return undefined if dataView service is not provided', async () => {
    const result = await getESQLAdHocDataViewForSecuritySolution({
      dataViews: undefined,
      indexPattern,
    });

    expect(result).toBeUndefined();
  });
});
