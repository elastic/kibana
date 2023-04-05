/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TableHeaderTooltipCell } from './table_header_tooltip_cell';

import { render, screen, fireEvent } from '@testing-library/react';

describe('Component TableHeaderTooltipCell', () => {
  it('shoud render text with icon and tooltip', async () => {
    render(<TableHeaderTooltipCell title="test title" tooltipContent="test tooltip content" />);

    expect(screen.getByText('test title')).toBeInTheDocument();
    expect(screen.getByTestId('tableHeaderIcon')).toBeInTheDocument();

    fireEvent.mouseOver(screen.getByTestId('tableHeaderIcon'));
    expect(await screen.findByText('test tooltip content')).toBeInTheDocument();
  });

  it('shoud render test element as custom tooltip', () => {
    render(
      <TableHeaderTooltipCell
        title="test title"
        customTooltip={<div data-test-subj="customTestTooltip" />}
      />
    );

    expect(screen.getByText('test title')).toBeInTheDocument();
    expect(screen.getByTestId('customTestTooltip')).toBeInTheDocument();
  });
});
