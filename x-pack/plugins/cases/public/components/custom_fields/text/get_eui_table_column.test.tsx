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

  beforeEach(() => {
    appMockRender = createAppMockRenderer();

    jest.clearAllMocks();
  });

  it('returns a name and a render function', async () => {
    const label = 'MockLabel';

    expect(getEuiTableColumn({ label })).toEqual({
      name: label,
      render: expect.any(Function),
      width: '250px',
      'data-test-subj': 'text-custom-field-column',
    });
  });

  it('render function renders a text column correctly', async () => {
    const key = 'test_key_1';
    const value = 'foobar';
    const column = getEuiTableColumn({ label: 'MockLabel' });

    appMockRender.render(<div>{column.render({ key, type: CustomFieldTypes.TEXT, value })}</div>);

    expect(screen.getByTestId(`text-custom-field-column-view-${key}`)).toBeInTheDocument();
    expect(screen.getByTestId(`text-custom-field-column-view-${key}`)).toHaveTextContent(value);
  });
});
