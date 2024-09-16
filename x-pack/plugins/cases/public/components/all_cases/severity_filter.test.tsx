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
import { screen, waitFor, within } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { SeverityFilter } from './severity_filter';

// Failing: See https://github.com/elastic/kibana/issues/176336
describe('Severity form field', () => {
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
    const t0 = performance.now();
    appMockRender.render(<SeverityFilter {...props} />);
    const t1 = performance.now();
    console.log(`Call to render took ${t1 - t0} milliseconds.`);
    const popoverButton = await screen.findByTestId('options-filter-popover-button-severity');
    const t2 = performance.now();
    console.log(`Call to find by test id took ${t2 - t1} milliseconds.`);
    expect(popoverButton).toBeInTheDocument();
    expect(popoverButton).not.toBeDisabled();

    const t3 = performance.now();
    console.log(`Call to expect took ${t3 - t2} milliseconds.`);
    await userEvent.click(popoverButton);

    await waitForEuiPopoverOpen();
    const t4 = performance.now();

    console.log(`Call to click took ${t4 - t3} milliseconds.`);
    const allOptions = await within(await screen.findByTestId('euiSelectableList')).findAllByRole(
      'option'
    );
    const t5 = performance.now();
    console.log(`Call to find all by role took ${t5 - t4} milliseconds.`);
    expect(allOptions.length).toBe(4);
    expect(allOptions[0]).toHaveAttribute('title', CaseSeverity.LOW);
    expect(allOptions[1]).toHaveAttribute('title', CaseSeverity.MEDIUM);
    expect(allOptions[2]).toHaveAttribute('title', CaseSeverity.HIGH);
    expect(allOptions[3]).toHaveAttribute('title', CaseSeverity.CRITICAL);
  });

  it('selects the correct value when changed', async () => {
    appMockRender.render(<SeverityFilter {...props} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Severity' }));

    await waitForEuiPopoverOpen();

    await userEvent.click(
      await within(await screen.findByTestId('euiSelectableList')).findByRole('option', {
        name: 'high',
      })
    );

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        filterId: 'severity',
        selectedOptionKeys: ['high'],
      });
    });
  });
});
