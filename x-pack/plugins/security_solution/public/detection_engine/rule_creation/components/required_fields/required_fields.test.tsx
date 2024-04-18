/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render, act, fireEvent, waitFor } from '@testing-library/react';
import { FIELD_TYPES, Form, useForm } from '../../../../shared_imports';

import type { DataViewFieldBase } from '@kbn/es-query';
import { RequiredFields } from './required_fields';
import type { RequiredFieldWithOptionalEcs } from './types';

const COMBO_BOX_TOGGLE_BUTTON_TEST_ID = 'comboBoxToggleListButton';

describe('RequiredFields form part', () => {
  it('displays the required fields label', () => {
    render(<TestForm initialState={[]} />);

    expect(screen.getByText('Required fields'));
  });

  it('displays previosuly saved required fields', () => {
    const initialState: RequiredFieldWithOptionalEcs[] = [
      { name: 'field1', type: 'string' },
      { name: 'field2', type: 'number' },
    ];

    render(<TestForm initialState={initialState} />);

    expect(screen.getByDisplayValue('field1')).toBeVisible();
    expect(screen.getByDisplayValue('string')).toBeVisible();

    expect(screen.getByDisplayValue('field2')).toBeVisible();
    expect(screen.getByDisplayValue('number')).toBeVisible();
  });

  it('user can add a new required field and submit', async () => {
    const initialState: RequiredFieldWithOptionalEcs[] = [{ name: 'field1', type: 'string' }];

    const indexPatternFields: DataViewFieldBase[] = [
      createIndexPatternField({ name: 'field2', esTypes: ['text'] }),
    ];

    const handleSubmit = jest.fn();

    render(
      <TestForm
        initialState={initialState}
        indexPatternFields={indexPatternFields}
        onSubmit={handleSubmit}
      />
    );

    await addRequiredFieldRow();
    await selectFirstEuiComboBoxOption({
      comboBoxToggleButton: screen.getByTestId(COMBO_BOX_TOGGLE_BUTTON_TEST_ID),
    });
  });
});

function createIndexPatternField(overrides: Partial<DataViewFieldBase>): DataViewFieldBase {
  return {
    name: 'one',
    type: 'string',
    esTypes: [],
    ...overrides,
  };
}

function addRequiredFieldRow(): Promise<void> {
  return act(async () => {
    fireEvent.click(screen.getByText('Add required field'));
  });
}

function showEuiComboBoxOptions(comboBoxToggleButton: HTMLElement): Promise<void> {
  fireEvent.click(comboBoxToggleButton);

  return waitFor(() => {
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
}

function selectEuiComboBoxOption({
  comboBoxToggleButton,
  optionIndex,
}: {
  comboBoxToggleButton: HTMLElement;
  optionIndex: number;
}): Promise<void> {
  return act(async () => {
    await showEuiComboBoxOptions(comboBoxToggleButton);

    fireEvent.click(screen.getAllByRole('option')[optionIndex]);
  });
}

function selectFirstEuiComboBoxOption({
  comboBoxToggleButton,
}: {
  comboBoxToggleButton: HTMLElement;
}): Promise<void> {
  return selectEuiComboBoxOption({ comboBoxToggleButton, optionIndex: 0 });
}

interface TestFormProps {
  initialState?: RequiredFieldWithOptionalEcs[];
  onSubmit?: (args: { data: RequiredFieldWithOptionalEcs[]; isValid: boolean }) => void;
  indexPatternFields?: BrowserField[];
}

function TestForm({ indexPatternFields, initialState, onSubmit }: TestFormProps): JSX.Element {
  const { form } = useForm({
    options: { stripEmptyFields: false },
    schema: {
      requiredFieldsField: {
        type: FIELD_TYPES.JSON,
      },
    },
    defaultValue: {
      requiredFieldsField: initialState,
    },
    onSubmit: async (formData, isValid) =>
      onSubmit?.({ data: formData.requiredFieldsField, isValid }),
  });

  return (
    <Form form={form} component="form">
      <RequiredFields path="requiredFieldsField" indexPatternFields={indexPatternFields} />
      <button type="button" onClick={form.submit}>
        {'Submit'}
      </button>
    </Form>
  );
}
