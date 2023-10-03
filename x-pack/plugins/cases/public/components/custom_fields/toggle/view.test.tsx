/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { CustomFieldTypes } from '../../../../common/types/domain';
import { View } from './view';

describe('View ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const customField = {
    type: CustomFieldTypes.TOGGLE as const,
    key: 'test_key_1',
    value: true,
  };

  it('renders correctly', async () => {
    render(<View customField={customField} />);

    expect(screen.getByTestId('toggle-custom-field-view-test_key_1')).toBeInTheDocument();
  });
});
