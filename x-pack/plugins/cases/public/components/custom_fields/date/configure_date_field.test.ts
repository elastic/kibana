/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configureDateCustomFieldFactory } from './configure_date_field';

describe('configureDateCustomFieldFactory ', () => {
  const builder = configureDateCustomFieldFactory();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    expect(builder).toEqual({
      id: 'date',
      label: 'Date',
      getEuiTableColumn: expect.any(Function),
      build: expect.any(Function),
    });
  });
});
