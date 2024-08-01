/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { TableFieldNameCell } from './table_field_name_cell';
import {
  FLYOUT_TABLE_FIELD_NAME_CELL_ICON_TEST_ID,
  FLYOUT_TABLE_FIELD_NAME_CELL_TEXT_TEST_ID,
} from './test_ids';

const mockDataType = 'date';
const mockField = '@timestamp';

describe('TableFieldNameCell', () => {
  it('should render icon and text', () => {
    const { getByTestId } = render(
      <TableFieldNameCell dataType={mockDataType} field={mockField} />
    );

    expect(getByTestId(FLYOUT_TABLE_FIELD_NAME_CELL_ICON_TEST_ID)).toBeInTheDocument();
    expect(
      getByTestId(FLYOUT_TABLE_FIELD_NAME_CELL_ICON_TEST_ID).querySelector('span')
    ).toHaveAttribute('data-euiicon-type', 'tokenDate');
    expect(getByTestId(FLYOUT_TABLE_FIELD_NAME_CELL_TEXT_TEST_ID)).toHaveTextContent(mockField);
  });

  it('should render default icon', () => {
    const { getByTestId } = render(
      <TableFieldNameCell dataType={'wrong_type'} field={mockField} />
    );

    expect(
      getByTestId(FLYOUT_TABLE_FIELD_NAME_CELL_ICON_TEST_ID).querySelector('span')
    ).toHaveAttribute('data-euiicon-type', 'questionInCircle');
  });
});
