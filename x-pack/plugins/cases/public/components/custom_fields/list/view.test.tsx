/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import type { ListCustomFieldConfiguration } from '../../../../common/types/domain';
import { CustomFieldTypes } from '../../../../common/types/domain';
import { View } from './view';

describe('View ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const configuration: ListCustomFieldConfiguration = {
    options: [{ key: 'test_option', label: 'My list test value' }],
    type: CustomFieldTypes.LIST,
    key: 'test_key_1',
    label: 'Test list label',
    required: false,
  };

  const customField = {
    type: CustomFieldTypes.LIST as const,
    key: 'test_key_1',
    value: { test_option: 'My list test value' },
  };

  it('renders correctly', async () => {
    render(<View customField={customField} configuration={configuration} />);

    expect(screen.getByText('My list test value')).toBeInTheDocument();
  });
});
