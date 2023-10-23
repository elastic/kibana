/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { render, screen } from '@testing-library/react';

import { CustomFieldTypes } from '../../../../common/types/domain';
import { TestProviders } from '../../../common/mock';
import { basicCase } from '../../../containers/mock';
import { getColumn } from './get_column';

describe('getColumn ', () => {
  const key = 'test_key_1';

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

  it.each([
    ['true', 'true', [{ key, type: CustomFieldTypes.TOGGLE as const, value: true }]],
    ['false', 'false', [{ key, type: CustomFieldTypes.TOGGLE as const, value: false }]],
    ['null', 'false', [{ key, type: CustomFieldTypes.TOGGLE as const, value: null }]],
    ['missing', 'false', []],
  ])(
    'render function renders a toggle column with value %s correctly',
    async (_, expectedResult, customFields) => {
      const label = 'MockLabel';
      const column = getColumn({ key, label });
      const theCase = { ...basicCase };

      theCase.customFields = customFields;

      render(<TestProviders>{column.render(theCase)}</TestProviders>);

      expect(screen.getByTestId(`toggle-custom-field-column-view-${key}`)).toBeInTheDocument();
      expect(screen.getByTestId(`toggle-custom-field-column-view-${key}`)).toHaveAttribute(
        'aria-checked',
        expectedResult
      );
    }
  );

  it('render function handles a wrong type custom field error correctly', async () => {
    const column = getColumn({ key, label: 'MockLabel' });
    const theCase = { ...basicCase };

    theCase.customFields = [{ key, type: CustomFieldTypes.TEXT as const, value: 'true' }];

    render(<TestProviders>{column.render(theCase)}</TestProviders>);

    expect(screen.getByTestId(`empty-toggle-custom-field-column-view-${key}`)).toBeInTheDocument();
  });
});
