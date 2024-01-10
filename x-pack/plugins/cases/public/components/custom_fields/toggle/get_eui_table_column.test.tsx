/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { screen } from '@testing-library/react';

import { CustomFieldTypes } from '../../../../common/types/domain';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { getEuiTableColumn } from './get_eui_table_column';

describe('getEuiTableColumn ', () => {
  let appMockRender: AppMockRenderer;
  const key = 'test_key_1';

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('returns a name and a render function', async () => {
    const label = 'MockLabel';

    expect(getEuiTableColumn({ label })).toEqual({
      name: label,
      render: expect.any(Function),
      width: '100px',
      'data-test-subj': 'toggle-custom-field-column',
    });
  });

  it.each([
    ['true', 'check', { key, type: CustomFieldTypes.TOGGLE as const, value: true }],
    ['false', 'cross', { key, type: CustomFieldTypes.TOGGLE as const, value: false }],
    ['null', 'cross', { key, type: CustomFieldTypes.TOGGLE as const, value: null }],
  ])(
    'render function renders a toggle column with value %s correctly',
    async (_, expectedResult, customField) => {
      const label = 'MockLabel';
      const column = getEuiTableColumn({ label });

      appMockRender.render(<div>{column.render(customField)}</div>);

      expect(
        screen.getByTestId(`toggle-custom-field-column-view-${key}-${expectedResult}`)
      ).toBeInTheDocument();
    }
  );
});
