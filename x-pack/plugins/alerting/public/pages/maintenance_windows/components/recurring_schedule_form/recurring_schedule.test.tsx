/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Frequency } from '@kbn/rrule';
import { fireEvent, within } from '@testing-library/react';
import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { AppMockRenderer, createAppMockRenderer } from '../../../../lib/test_utils';
import { FormProps, schema } from '../schema';
import { RecurringSchedule } from './recurring_schedule';
import { EndsOptions } from '../../constants';

const initialValue: FormProps = {
  title: 'test',
  startDate: '2023-03-24',
  endDate: '2023-03-26',
  recurring: true,
  categoryIds: [],
};

describe('RecurringSchedule', () => {
  let appMockRenderer: AppMockRenderer;

  const MockHookWrapperComponent: React.FC<{ iv?: FormProps }> = ({
    children,
    iv = initialValue,
  }) => {
    const { form } = useForm<FormProps>({
      defaultValue: iv,
      options: { stripEmptyFields: false },
      schema,
    });

    return <Form form={form}>{children}</Form>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  it('renders all form fields', async () => {
    const result = appMockRenderer.render(
      <MockHookWrapperComponent>
        <RecurringSchedule />
      </MockHookWrapperComponent>
    );

    expect(result.getByTestId('frequency-field')).toBeInTheDocument();
    expect(result.queryByTestId('custom-recurring-form')).not.toBeInTheDocument();
    expect(result.getByTestId('ends-field')).toBeInTheDocument();
    expect(result.queryByTestId('until-field')).not.toBeInTheDocument();
    expect(result.queryByTestId('count-field')).not.toBeInTheDocument();
  });

  it('renders until field if ends = on_date', async () => {
    const result = appMockRenderer.render(
      <MockHookWrapperComponent>
        <RecurringSchedule />
      </MockHookWrapperComponent>
    );

    const btn = within(result.getByTestId('ends-field')).getByTestId('ondate');

    fireEvent.click(btn);
    expect(result.getByTestId('until-field')).toBeInTheDocument();
  });

  it('renders until field if ends = after_x', async () => {
    const result = appMockRenderer.render(
      <MockHookWrapperComponent>
        <RecurringSchedule />
      </MockHookWrapperComponent>
    );

    const btn = within(result.getByTestId('ends-field')).getByTestId('afterx');

    fireEvent.click(btn);
    expect(result.getByTestId('count-field')).toBeInTheDocument();
  });

  it('should initialize the form when no initialValue provided', () => {
    const result = appMockRenderer.render(
      <MockHookWrapperComponent>
        <RecurringSchedule />
      </MockHookWrapperComponent>
    );

    const frequencyInput = within(result.getByTestId('frequency-field')).getByTestId('select');
    const endsInput = within(result.getByTestId('ends-field')).getByTestId('never');

    expect(frequencyInput).toHaveValue('3');
    expect(endsInput).toHaveAttribute('aria-pressed', 'true');
  });

  it('should prefill the form when provided with initialValue', () => {
    const iv: FormProps = {
      ...initialValue,
      recurringSchedule: {
        frequency: Frequency.MONTHLY,
        ends: EndsOptions.ON_DATE,
        until: '2023-03-24',
      },
    };
    const result = appMockRenderer.render(
      <MockHookWrapperComponent iv={iv}>
        <RecurringSchedule />
      </MockHookWrapperComponent>
    );

    const frequencyInput = within(result.getByTestId('frequency-field')).getByTestId('select');
    const endsInput = within(result.getByTestId('ends-field')).getByTestId('ondate');
    const untilInput = within(result.getByTestId('until-field')).getByLabelText(
      // using the aria-label to query for the date-picker input
      'Press the down key to open a popover containing a calendar.'
    );
    expect(frequencyInput).toHaveValue('1');
    expect(endsInput).toHaveAttribute('aria-pressed', 'true');
    expect(untilInput).toHaveValue('03/24/2023');
  });
});
