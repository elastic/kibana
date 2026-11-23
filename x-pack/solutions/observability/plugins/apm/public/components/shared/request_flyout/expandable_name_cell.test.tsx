/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { REQUEST_FLYOUT_EBT_ELEMENTS } from './ebt_constants';
import { ExpandableNameCell } from './expandable_name_cell';

function renderCell(isExpanded: boolean, onToggle = jest.fn()) {
  render(
    <ExpandableNameCell
      name="GET /api"
      isExpanded={isExpanded}
      onToggle={onToggle}
      ebtElement={REQUEST_FLYOUT_EBT_ELEMENTS.OPERATION_NAME}
      data-test-subj="nameCell"
    />
  );
  return onToggle;
}

describe('ExpandableNameCell', () => {
  it('toggles from the name and from the icon', () => {
    const onToggle = renderCell(false);

    fireEvent.click(screen.getByTestId('nameCell'));
    fireEvent.click(screen.getByTestId('nameCell-expand'));

    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('offers to open the details when collapsed', () => {
    renderCell(false);

    expect(screen.getByRole('button', { name: 'Open details' })).toBeInTheDocument();
  });

  it('offers to close the details when expanded', () => {
    renderCell(true);

    expect(screen.getByRole('button', { name: 'Close details' })).toBeInTheDocument();
  });
});
