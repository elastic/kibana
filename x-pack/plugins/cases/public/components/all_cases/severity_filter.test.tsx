/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity } from '../../../common/types/domain';
import React from 'react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { SeverityFilter } from './severity_filter';

// FLAKY: https://github.com/elastic/kibana/issues/176336
describe.skip('Severity form field', () => {
  const onChange = jest.fn();
  let appMockRender: AppMockRenderer;
  const props = {
    selectedOptionKeys: [],
    onChange,
  };

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('renders', async () => {
    appMockRender.render(<SeverityFilter {...props} />);
    expect(await screen.findByTestId('options-filter-popover-button-severity')).toBeInTheDocument();
    expect(await screen.findByTestId('options-filter-popover-button-severity')).not.toBeDisabled();

    userEvent.click(await screen.findByRole('button', { name: 'Severity' }));
    await waitForEuiPopoverOpen();

    expect(await screen.findByRole('option', { name: CaseSeverity.LOW })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: CaseSeverity.MEDIUM })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: CaseSeverity.HIGH })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: CaseSeverity.CRITICAL })).toBeInTheDocument();
    expect((await screen.findAllByRole('option')).length).toBe(4);
  });

  it('selects the correct value when changed', async () => {
    appMockRender.render(<SeverityFilter {...props} />);

    userEvent.click(await screen.findByRole('button', { name: 'Severity' }));
    await waitForEuiPopoverOpen();
    userEvent.click(await screen.findByRole('option', { name: 'high' }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        filterId: 'severity',
        selectedOptionKeys: ['high'],
      });
    });
  });
});
