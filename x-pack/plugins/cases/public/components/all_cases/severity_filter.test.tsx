/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity } from '../../../common/api';
import React from 'react';
import { AppMockRenderer, createAppMockRenderer } from '../../common/mock';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/dom';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { SeverityFilter } from './severity_filter';

describe('Severity form field', () => {
  const onSeverityChange = jest.fn();
  let appMockRender: AppMockRenderer;
  const props = {
    isLoading: false,
    selectedSeverity: CaseSeverity.LOW,
    isDisabled: false,
    onSeverityChange,
  };
  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });
  it('renders', () => {
    const result = appMockRender.render(<SeverityFilter {...props} />);
    expect(result.getByTestId('case-severity-filter')).not.toHaveAttribute('disabled');
  });

  // default to LOW in this test configuration
  it('defaults to the correct value', () => {
    const result = appMockRender.render(<SeverityFilter {...props} />);
    // two items. one for the popover one for the selected field
    expect(result.getAllByTestId('case-severity-filter-low').length).toBe(2);
  });

  it('selects the correct value when changed', async () => {
    const result = appMockRender.render(<SeverityFilter {...props} />);
    userEvent.click(result.getByTestId('case-severity-filter'));
    await waitForEuiPopoverOpen();
    userEvent.click(result.getByTestId('case-severity-filter-high'));
    await waitFor(() => {
      expect(onSeverityChange).toHaveBeenCalledWith('high');
    });
  });

  it('selects the correct value when changed (all)', async () => {
    const result = appMockRender.render(<SeverityFilter {...props} />);
    userEvent.click(result.getByTestId('case-severity-filter'));
    await waitForEuiPopoverOpen();
    userEvent.click(result.getByTestId('case-severity-filter-all'));
    await waitFor(() => {
      expect(onSeverityChange).toHaveBeenCalledWith('all');
    });
  });
});
