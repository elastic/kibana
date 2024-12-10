/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformFindMaintenanceWindowParams } from './v1';

describe('transformFindMaintenanceWindowParams', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('passing string in statuses should return array', () => {
    const result = transformFindMaintenanceWindowParams({
      page: 1,
      per_page: 10,
      search: 'fake mw name',
      statuses: 'running',
    });

    expect(result).toEqual({ page: 1, perPage: 10, search: 'fake mw name', statuses: ['running'] });
  });

  it('passing array in statuses should return array', () => {
    const result = transformFindMaintenanceWindowParams({
      page: 1,
      per_page: 10,
      search: 'fake mw name',
      statuses: ['upcoming', 'finished'],
    });

    expect(result).toEqual({
      page: 1,
      perPage: 10,
      search: 'fake mw name',
      statuses: ['upcoming', 'finished'],
    });
  });
});
