/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configureToggleCustomFieldFactory } from './configure_toggle_field';

describe('configureToggleCustomFieldFactory ', () => {
  const builder = configureToggleCustomFieldFactory();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    expect(builder).toEqual({
      id: 'toggle',
      label: 'Toggle',
      build: expect.any(Function),
    });
  });
});
