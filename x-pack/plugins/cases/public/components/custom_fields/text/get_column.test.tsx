/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { render, screen } from '@testing-library/react';

import { CustomFieldTypes } from '../../../../common/types/domain';
import { basicCase } from '../../../containers/mock';
import { TestProviders } from '../../../common/mock';
import { getColumn } from './get_column';

describe('getColumn ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a name and a render function', async () => {
    const label = 'MockLabel';

    expect(getColumn({ key: 'test_key_1', label })).toEqual({
      name: label,
      render: expect.any(Function),
    });
  });

  it('render function renders a text column correctly', async () => {
    const key = 'test_key_1';
    const value = 'foobar';
    const column = getColumn({ key, label: 'MockLabel' });
    const theCase = { ...basicCase };

    theCase.customFields = [{ key, type: CustomFieldTypes.TEXT, value }];

    render(<TestProviders>{column.render(theCase)}</TestProviders>);

    expect(screen.getByTestId(`text-custom-field-column-view-${key}`)).toBeInTheDocument();
    expect(screen.getByTestId(`text-custom-field-column-view-${key}`)).toHaveTextContent(value);
  });

  it('render function handles a missing custom field correctly', async () => {
    const key = 'test_key_1';
    const column = getColumn({ key, label: 'MockLabel' });
    const theCase = basicCase;

    render(<TestProviders>{column.render(theCase)}</TestProviders>);

    expect(screen.getByTestId(`empty-text-custom-field-column-view-${key}`)).toBeInTheDocument();
  });
});
