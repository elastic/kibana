/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity } from '../../../common/api';
import { render } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import React from 'react';
import { SeveritySelector } from './selector';
import userEvent from '@testing-library/user-event';

describe('Severity field selector', () => {
  const onSeverityChange = jest.fn();
  it('renders a list of severity fields', () => {
    const result = render(
      <SeveritySelector
        selectedSeverity={CaseSeverity.MEDIUM}
        onSeverityChange={onSeverityChange}
        isLoading={false}
        isDisabled={false}
      />
    );

    expect(result.getByTestId('case-severity-selection')).toBeTruthy();
    expect(result.getAllByTestId('case-severity-selection-medium').length).toBeTruthy();
  });

  it('renders a list of severity options when clicked', () => {
    const result = render(
      <SeveritySelector
        selectedSeverity={CaseSeverity.MEDIUM}
        onSeverityChange={onSeverityChange}
        isLoading={false}
        isDisabled={false}
      />
    );
    userEvent.click(result.getByTestId('case-severity-selection'));
    expect(result.getByTestId('case-severity-selection-low')).toBeTruthy();
    expect(result.getAllByTestId('case-severity-selection-medium').length).toBeTruthy();
    expect(result.getByTestId('case-severity-selection-high')).toBeTruthy();
    expect(result.getByTestId('case-severity-selection-critical')).toBeTruthy();
  });

  it('calls onSeverityChange with the newly selected severity when clicked', async () => {
    const result = render(
      <SeveritySelector
        selectedSeverity={CaseSeverity.MEDIUM}
        onSeverityChange={onSeverityChange}
        isLoading={false}
        isDisabled={false}
      />
    );
    userEvent.click(result.getByTestId('case-severity-selection'));
    await waitForEuiPopoverOpen();
    expect(result.getByTestId('case-severity-selection-low')).toBeTruthy();
    userEvent.click(result.getByTestId('case-severity-selection-low'));
    expect(onSeverityChange).toHaveBeenLastCalledWith('low');
  });
});
