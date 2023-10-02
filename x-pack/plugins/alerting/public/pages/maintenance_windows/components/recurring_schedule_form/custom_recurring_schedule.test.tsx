/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor, within } from '@testing-library/react';
import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Frequency } from '@kbn/rrule';
import { AppMockRenderer, createAppMockRenderer } from '../../../../lib/test_utils';
import { FormProps, schema } from '../schema';
import { CustomRecurringSchedule } from './custom_recurring_schedule';
import { EndsOptions } from '../../constants';

const initialValue: FormProps = {
  title: 'test',
  startDate: '2023-03-24',
  endDate: '2023-03-26',
  recurring: true,
  recurringSchedule: {
    frequency: 'CUSTOM',
    ends: EndsOptions.NEVER,
  },
  categoryIds: [],
};

describe('CustomRecurringSchedule', () => {
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
        <CustomRecurringSchedule />
      </MockHookWrapperComponent>
    );

    expect(result.getByTestId('interval-field')).toBeInTheDocument();
    expect(result.getByTestId('custom-frequency-field')).toBeInTheDocument();
    expect(result.getByTestId('byweekday-field')).toBeInTheDocument();
    expect(result.queryByTestId('bymonth-field')).not.toBeInTheDocument();
  });

  it('renders byweekday field if custom frequency = weekly', async () => {
    const result = appMockRenderer.render(
      <MockHookWrapperComponent>
        <CustomRecurringSchedule />
      </MockHookWrapperComponent>
    );

    fireEvent.change(within(result.getByTestId('custom-frequency-field')).getByTestId('select'), {
      target: { value: Frequency.WEEKLY },
    });
    await waitFor(() => expect(result.getByTestId('byweekday-field')).toBeInTheDocument());
  });

  it('renders byweekday field if frequency = daily', async () => {
    const iv: FormProps = {
      ...initialValue,
      recurringSchedule: {
        frequency: Frequency.DAILY,
        ends: EndsOptions.NEVER,
      },
    };
    const result = appMockRenderer.render(
      <MockHookWrapperComponent iv={iv}>
        <CustomRecurringSchedule />
      </MockHookWrapperComponent>
    );

    expect(result.getByTestId('byweekday-field')).toBeInTheDocument();
  });

  it('renders bymonth field if custom frequency = monthly', async () => {
    const result = appMockRenderer.render(
      <MockHookWrapperComponent>
        <CustomRecurringSchedule />
      </MockHookWrapperComponent>
    );

    fireEvent.change(within(result.getByTestId('custom-frequency-field')).getByTestId('select'), {
      target: { value: Frequency.MONTHLY },
    });
    await waitFor(() => expect(result.getByTestId('bymonth-field')).toBeInTheDocument());
  });

  it('should initialize the form when no initialValue provided', () => {
    const result = appMockRenderer.render(
      <MockHookWrapperComponent>
        <CustomRecurringSchedule />
      </MockHookWrapperComponent>
    );

    const frequencyInput = within(result.getByTestId('custom-frequency-field')).getByTestId(
      'select'
    );
    const intervalInput = within(result.getByTestId('interval-field')).getByTestId('input');

    expect(frequencyInput).toHaveValue('2');
    expect(intervalInput).toHaveValue(1);
  });

  it('should prefill the form when provided with initialValue', () => {
    const iv: FormProps = {
      ...initialValue,
      recurringSchedule: {
        frequency: 'CUSTOM',
        ends: EndsOptions.NEVER,
        customFrequency: Frequency.WEEKLY,
        interval: 3,
        byweekday: { 1: false, 2: false, 3: true, 4: true, 5: false, 6: false, 7: false },
      },
    };
    const result = appMockRenderer.render(
      <MockHookWrapperComponent iv={iv}>
        <CustomRecurringSchedule />
      </MockHookWrapperComponent>
    );

    const frequencyInput = within(result.getByTestId('custom-frequency-field')).getByTestId(
      'select'
    );
    const intervalInput = within(result.getByTestId('interval-field')).getByTestId('input');
    const input3 = within(result.getByTestId('byweekday-field'))
      .getByTestId('3')
      .getAttribute('aria-pressed');
    const input4 = within(result.getByTestId('byweekday-field'))
      .getByTestId('4')
      .getAttribute('aria-pressed');
    expect(frequencyInput).toHaveValue('2');
    expect(intervalInput).toHaveValue(3);
    expect(input3).toBe('true');
    expect(input4).toBe('true');
  });
});
