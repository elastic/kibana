/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity } from '../../../common/api';
import React from 'react';
import { AppMockRenderer, createAppMockRenderer } from '../../common/mock';
import { Form, FormHook, useForm } from '../../common/shared_imports';
import { Severity } from './severity';
import { FormProps, schema } from './schema';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/dom';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

let globalForm: FormHook;
const MockHookWrapperComponent: React.FC = ({ children }) => {
  const { form } = useForm<FormProps>({
    defaultValue: { severity: CaseSeverity.LOW },
    schema: {
      severity: schema.severity,
    },
  });

  globalForm = form;

  return <Form form={form}>{children}</Form>;
};
describe('Severity form field', () => {
  let appMockRender: AppMockRenderer;
  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });
  it('renders', () => {
    const result = appMockRender.render(
      <MockHookWrapperComponent>
        <Severity isLoading={false} />
      </MockHookWrapperComponent>
    );
    expect(result.getByTestId('caseSeverity')).toBeTruthy();
    expect(result.getByTestId('case-severity-selection')).not.toHaveAttribute('disabled');
  });

  // default to LOW in this test configuration
  it('defaults to the correct value', () => {
    const result = appMockRender.render(
      <MockHookWrapperComponent>
        <Severity isLoading={false} />
      </MockHookWrapperComponent>
    );
    expect(result.getByTestId('caseSeverity')).toBeTruthy();
    // two items. one for the popover one for the selected field
    expect(result.getAllByTestId('case-severity-selection-low').length).toBe(2);
  });

  it('selects the correct value when changed', async () => {
    const result = appMockRender.render(
      <MockHookWrapperComponent>
        <Severity isLoading={false} />
      </MockHookWrapperComponent>
    );
    expect(result.getByTestId('caseSeverity')).toBeTruthy();
    userEvent.click(result.getByTestId('case-severity-selection'));
    await waitForEuiPopoverOpen();
    userEvent.click(result.getByTestId('case-severity-selection-high'));
    await waitFor(() => {
      expect(globalForm.getFormData()).toEqual({ severity: 'high' });
    });
  });

  it('disables when loading data', () => {
    const result = appMockRender.render(
      <MockHookWrapperComponent>
        <Severity isLoading={true} />
      </MockHookWrapperComponent>
    );
    expect(result.getByTestId('case-severity-selection')).toHaveAttribute('disabled');
  });
});
