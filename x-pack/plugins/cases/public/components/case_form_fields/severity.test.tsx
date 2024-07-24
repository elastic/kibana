/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { Severity } from './severity';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { FormTestComponent } from '../../common/test_utils';

const onSubmit = jest.fn();

// FLAKY: https://github.com/elastic/kibana/issues/188951
describe.skip('Severity form field', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('renders', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <Severity isLoading={false} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseSeverity')).toBeInTheDocument();
    expect(await screen.findByTestId('case-severity-selection')).not.toHaveAttribute('disabled');
  });

  // default to LOW in this test configuration
  it('defaults to the correct value', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <Severity isLoading={false} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseSeverity')).toBeInTheDocument();
    expect(await screen.findByTestId('case-severity-selection-low')).toBeInTheDocument();
  });

  it('selects the correct value when changed', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <Severity isLoading={false} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseSeverity')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('case-severity-selection'));
    await waitForEuiPopoverOpen();

    userEvent.click(await screen.findByTestId('case-severity-selection-high'));

    userEvent.click(await screen.findByTestId('form-test-component-submit-button'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith({ severity: 'high' }, true);
    });
  });

  it('disables when loading data', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <Severity isLoading={true} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('case-severity-selection')).toHaveAttribute('disabled');
  });
});
