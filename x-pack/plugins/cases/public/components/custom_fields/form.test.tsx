/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import type { CustomFieldFormState } from './form';
import { CustomFieldsForm } from './form';
import { CustomFieldTypes } from '../../../common/types/domain';
import * as i18n from './translations';
import userEvent from '@testing-library/user-event';
import { customFieldsConfigurationMock } from '../../containers/mock';

describe('CustomFieldsForm ', () => {
  let appMockRender: AppMockRenderer;
  const onChange = jest.fn();

  const props = {
    onChange,
    initialValue: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', async () => {
    appMockRender.render(<CustomFieldsForm {...props} />);

    expect(screen.getByTestId('custom-field-label-input')).toBeInTheDocument();
    expect(screen.getByTestId('custom-field-type-selector')).toBeInTheDocument();
  });

  it('renders text as default custom field type', async () => {
    appMockRender.render(<CustomFieldsForm {...props} />);

    expect(screen.getByTestId('custom-field-type-selector')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();

    expect(screen.getByText(i18n.FIELD_OPTION_REQUIRED)).toBeInTheDocument();
  });

  it('renders custom field type options', async () => {
    appMockRender.render(<CustomFieldsForm {...props} />);

    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Toggle')).toBeInTheDocument();
    expect(screen.getByTestId('custom-field-type-selector')).not.toHaveAttribute('disabled');
  });

  it('renders toggle custom field type', async () => {
    appMockRender.render(<CustomFieldsForm {...props} />);

    fireEvent.change(screen.getByTestId('custom-field-type-selector'), {
      target: { value: CustomFieldTypes.TOGGLE },
    });

    expect(screen.getByTestId('toggle-custom-field-options')).toBeInTheDocument();
    expect(screen.getByText(i18n.FIELD_OPTION_REQUIRED)).toBeInTheDocument();
  });

  it('serializes the data correctly if required is selected', async () => {
    let formState: CustomFieldFormState;

    const onChangeState = (state: CustomFieldFormState) => (formState = state);

    appMockRender.render(<CustomFieldsForm onChange={onChangeState} initialValue={null} />);

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    userEvent.paste(screen.getByTestId('custom-field-label-input'), 'Summary');
    userEvent.click(screen.getByTestId('text-custom-field-options'));

    await act(async () => {
      const { data } = await formState!.submit();

      expect(data).toEqual({
        key: expect.anything(),
        label: 'Summary',
        required: true,
        type: 'text',
      });
    });
  });

  it('serializes the data correctly if required is not selected', async () => {
    let formState: CustomFieldFormState;

    const onChangeState = (state: CustomFieldFormState) => (formState = state);

    appMockRender.render(<CustomFieldsForm onChange={onChangeState} initialValue={null} />);

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    userEvent.paste(screen.getByTestId('custom-field-label-input'), 'Summary');

    await act(async () => {
      const { data } = await formState!.submit();

      expect(data).toEqual({
        key: expect.anything(),
        label: 'Summary',
        required: false,
        type: 'text',
      });
    });
  });

  it('deserializes the data correctly if required is selected', async () => {
    let formState: CustomFieldFormState;

    const onChangeState = (state: CustomFieldFormState) => (formState = state);

    appMockRender.render(
      <CustomFieldsForm onChange={onChangeState} initialValue={customFieldsConfigurationMock[0]} />
    );

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    expect(await screen.findByTestId('custom-field-type-selector')).toHaveAttribute('disabled');

    expect(await screen.findByTestId('custom-field-label-input')).toHaveAttribute(
      'value',
      customFieldsConfigurationMock[0].label
    );
    expect(await screen.findByTestId('text-custom-field-options')).toHaveAttribute('checked');

    await act(async () => {
      const { data } = await formState!.submit();

      expect(data).toEqual(customFieldsConfigurationMock[0]);
    });
  });

  it('deserializes the data correctly if required not selected', async () => {
    let formState: CustomFieldFormState;

    const onChangeState = (state: CustomFieldFormState) => (formState = state);

    appMockRender.render(
      <CustomFieldsForm onChange={onChangeState} initialValue={customFieldsConfigurationMock[1]} />
    );

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    expect(await screen.findByTestId('custom-field-type-selector')).toHaveAttribute('disabled');

    expect(await screen.findByTestId('custom-field-label-input')).toHaveAttribute(
      'value',
      customFieldsConfigurationMock[1].label
    );
    expect(await screen.findByTestId('text-custom-field-options')).not.toHaveAttribute('checked');

    await act(async () => {
      const { data } = await formState!.submit();

      expect(data).toEqual(customFieldsConfigurationMock[1]);
    });
  });
});
