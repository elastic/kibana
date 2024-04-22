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

  it('user can add a new required field to an empty form', async () => {
    const indexPatternFields: DataViewFieldBase[] = [
      createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
    ];

    render(<TestForm initialState={[]} indexPatternFields={indexPatternFields} />);

    await addRequiredFieldRow();
    await selectFirstEuiComboBoxOption({
      comboBoxToggleButton: getSelectToggleButtonForName('empty'),
    });

    expect(screen.getByDisplayValue('field1')).toBeVisible();
    expect(screen.getByDisplayValue('string')).toBeVisible();
  });

  it('user can add a new required field to a previosly saved form', async () => {
    const initialState: RequiredFieldWithOptionalEcs[] = [{ name: 'field1', type: 'string' }];

    const indexPatternFields: DataViewFieldBase[] = [
      createIndexPatternField({ name: 'field2', esTypes: ['keyword'] }),
    ];

    render(<TestForm initialState={initialState} indexPatternFields={indexPatternFields} />);

    await addRequiredFieldRow();

    await selectFirstEuiComboBoxOption({
      comboBoxToggleButton: getSelectToggleButtonForName('empty'),
    });

    expect(screen.getByDisplayValue('field2')).toBeVisible();
    expect(screen.getByDisplayValue('keyword')).toBeVisible();
  });

  it('user can select any field name that is available in index patterns', async () => {
    const indexPatternFields: DataViewFieldBase[] = [
      createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
      createIndexPatternField({ name: 'field2', esTypes: ['keyword'] }),
    ];

    render(<TestForm initialState={[]} indexPatternFields={indexPatternFields} />);

    await addRequiredFieldRow();

    await selectEuiComboBoxOption({
      comboBoxToggleButton: getSelectToggleButtonForName('empty'),
      optionIndex: 0,
    });

    expect(screen.getByDisplayValue('field1')).toBeVisible();
    expect(screen.getByDisplayValue('string')).toBeVisible();

    await addRequiredFieldRow();

    await selectEuiComboBoxOption({
      comboBoxToggleButton: getSelectToggleButtonForName('empty'),
      optionIndex: 0,
    });

    expect(screen.getByDisplayValue('field2')).toBeVisible();
    expect(screen.getByDisplayValue('keyword')).toBeVisible();
  });

  it('field type dropdown allows to choose from options if multiple types are available', async () => {
    const initialState: RequiredFieldWithOptionalEcs[] = [{ name: 'field1', type: 'string' }];

    const indexPatternFields: DataViewFieldBase[] = [
      createIndexPatternField({ name: 'field1', esTypes: ['string', 'keyword'] }),
    ];

    render(<TestForm initialState={initialState} indexPatternFields={indexPatternFields} />);

    await selectEuiComboBoxOption({
      comboBoxToggleButton: getSelectToggleButtonForType('string'),
      optionText: 'keyword',
    });

    expect(screen.getByDisplayValue('keyword')).toBeVisible();
  });

  it('field type dropdown is disabled if only a single type option is available', async () => {
    const initialState: RequiredFieldWithOptionalEcs[] = [{ name: 'field1', type: 'string' }];

    const indexPatternFields: DataViewFieldBase[] = [
      createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
    ];

    render(<TestForm initialState={initialState} indexPatternFields={indexPatternFields} />);

    expect(screen.getByDisplayValue('string')).toBeVisible();
    expect(screen.getByDisplayValue('string')).toBeDisabled();
  });

  it('user can remove a required field', async () => {
    const initialState: RequiredFieldWithOptionalEcs[] = [{ name: 'field1', type: 'string' }];

    const indexPatternFields: DataViewFieldBase[] = [
      createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
    ];

    render(<TestForm initialState={initialState} indexPatternFields={indexPatternFields} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('removeRequiredFieldButton-field1'));
    });

    expect(screen.queryByDisplayValue('field1')).toBeNull();
  });

  it('user can not select the same field twice', async () => {
    const initialState: RequiredFieldWithOptionalEcs[] = [{ name: 'field1', type: 'string' }];

    const indexPatternFields: DataViewFieldBase[] = [
      createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
      createIndexPatternField({ name: 'field2', esTypes: ['keyword'] }),
      createIndexPatternField({ name: 'field3', esTypes: ['date'] }),
    ];

    render(<TestForm initialState={initialState} indexPatternFields={indexPatternFields} />);

    await addRequiredFieldRow();

    const emptyRowOptions = await getDropdownOptions(getSelectToggleButtonForName('empty'));
    expect(emptyRowOptions).toEqual(['field2', 'field3']);

    await selectEuiComboBoxOption({
      comboBoxToggleButton: getSelectToggleButtonForName('empty'),
      optionText: 'field2',
    });

    const firstRowNameOptions = await getDropdownOptions(getSelectToggleButtonForName('field1'));
    expect(firstRowNameOptions).toEqual(['field1', 'field3']);
  });

  it('adding a new required field is disabled when index patterns are loading', async () => {
    render(
      <TestForm initialState={[]} indexPatternFields={undefined} isIndexPatternLoading={true} />
    );

    expect(screen.getByTestId('addRequiredFieldButton')).toBeDisabled();
  });

  it('adding a new required field is disabled when an empty row is already displayed', async () => {
    const indexPatternFields: DataViewFieldBase[] = [
      createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
    ];

    render(<TestForm initialState={[]} indexPatternFields={indexPatternFields} />);

    expect(screen.getByTestId('addRequiredFieldButton')).toBeEnabled();

    await addRequiredFieldRow();

    expect(screen.getByTestId('addRequiredFieldButton')).toBeDisabled();
  });

  it('adding a new required field is disabled when there are no available field names left', async () => {
    const indexPatternFields: DataViewFieldBase[] = [
      createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
      createIndexPatternField({ name: 'field2', esTypes: ['keyword'] }),
    ];

    render(<TestForm initialState={[]} indexPatternFields={indexPatternFields} />);

    await addRequiredFieldRow();
    await selectFirstEuiComboBoxOption({
      comboBoxToggleButton: getSelectToggleButtonForName('empty'),
    });

    expect(screen.getByTestId('addRequiredFieldButton')).toBeEnabled();

    await addRequiredFieldRow();
    await selectFirstEuiComboBoxOption({
      comboBoxToggleButton: getSelectToggleButtonForName('empty'),
    });

    expect(screen.getByTestId('addRequiredFieldButton')).toBeDisabled();
  });

  describe('warnings', () => {
    it('displays a warning when a selected field name is not found within index patterns', async () => {
      const initialState: RequiredFieldWithOptionalEcs[] = [
        { name: 'field-that-does-not-exist', type: 'keyword' },
      ];

      const indexPatternFields: DataViewFieldBase[] = [
        createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
      ];

      render(<TestForm initialState={initialState} indexPatternFields={indexPatternFields} />);

      expect(
        screen.getByText('Some fields are not found within specified index patterns.')
      ).toBeVisible();

      expect(
        screen.getByText(
          'Field "field-that-does-not-exist" is not found within specified index patterns'
        )
      ).toBeVisible();
    });

    it('displays a warning when a selected field type is not found within index patterns', async () => {
      const initialState: RequiredFieldWithOptionalEcs[] = [
        { name: 'field1', type: 'type-that-does-not-exist' },
      ];

      const indexPatternFields: DataViewFieldBase[] = [
        createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
      ];

      render(<TestForm initialState={initialState} indexPatternFields={indexPatternFields} />);

      expect(
        screen.getByText('Some fields are not found within specified index patterns.')
      ).toBeVisible();

      expect(
        screen.getByText(
          'Field "field1" with type "type-that-does-not-exist" is not found within specified index patterns'
        )
      ).toBeVisible();
    });

    it(`doesn't display a warning for a an empty row`, async () => {
      const indexPatternFields: DataViewFieldBase[] = [
        createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
      ];

      render(<TestForm initialState={[]} indexPatternFields={indexPatternFields} />);

      await addRequiredFieldRow();

      expect(
        screen.queryByText('Some fields are not found within specified index patterns.')
      ).toBeNull();
    });

    it(`doesn't display a warning when all selected fields are found within index patterns`, async () => {
      const initialState: RequiredFieldWithOptionalEcs[] = [{ name: 'field1', type: 'string' }];

      const indexPatternFields: DataViewFieldBase[] = [
        createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
      ];

      render(<TestForm initialState={initialState} indexPatternFields={indexPatternFields} />);

      expect(
        screen.queryByText('Some fields are not found within specified index patterns.')
      ).toBeNull();
    });
  });

  describe('form submission', () => {
    it('submits undefined when no required fields are selected', async () => {
      const handleSubmit = jest.fn();

      render(<TestForm initialState={[]} onSubmit={handleSubmit} />);

      await submitForm();

      /* 
        useForm's "submit" implementation calls setTimeout internally in cases when form is untouched.
        We need to tell Jest to wait for the next tick of the event loop to allow the form to be submitted.
      */
      await waitFor(() => {
        new Promise((resolve) => {
          setImmediate(resolve);
        });
      });

      expect(handleSubmit).toHaveBeenCalledWith({
        data: undefined,
        isValid: true,
      });
    });

    it('submits undefined when all selected fields were removed', async () => {
      const initialState: RequiredFieldWithOptionalEcs[] = [{ name: 'field1', type: 'string' }];

      const handleSubmit = jest.fn();

      render(<TestForm initialState={initialState} onSubmit={handleSubmit} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('removeRequiredFieldButton-field1'));
      });

      await submitForm();

      /* 
        useForm's "submit" implementation calls setTimeout internally in cases when form is untouched.
        We need to tell Jest to wait for the next tick of the event loop to allow the form to be submitted.
      */
      await waitFor(() => {
        new Promise((resolve) => {
          setImmediate(resolve);
        });
      });

      expect(handleSubmit).toHaveBeenCalledWith({
        data: undefined,
        isValid: true,
      });
    });

    it('submits without empty rows', async () => {
      const initialState: RequiredFieldWithOptionalEcs[] = [{ name: 'field1', type: 'string' }];

      const handleSubmit = jest.fn();

      render(<TestForm initialState={initialState} onSubmit={handleSubmit} />);

      await addRequiredFieldRow();
      await submitForm();

      expect(handleSubmit).toHaveBeenCalledWith({
        data: [{ name: 'field1', type: 'string' }],
        isValid: true,
      });
    });

    it('submits newly added required fields', async () => {
      const indexPatternFields: DataViewFieldBase[] = [
        createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
      ];

      const handleSubmit = jest.fn();

      render(
        <TestForm
          initialState={[]}
          indexPatternFields={indexPatternFields}
          onSubmit={handleSubmit}
        />
      );

      await addRequiredFieldRow();

      await selectFirstEuiComboBoxOption({
        comboBoxToggleButton: getSelectToggleButtonForName('empty'),
      });

      await submitForm();

      expect(handleSubmit).toHaveBeenCalledWith({
        data: [{ name: 'field1', type: 'string' }],
        isValid: true,
      });
    });

    it('submits previously saved required fields', async () => {
      const initialState: RequiredFieldWithOptionalEcs[] = [{ name: 'field1', type: 'string' }];

      const indexPatternFields: DataViewFieldBase[] = [
        createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
      ];

      const handleSubmit = jest.fn();

      render(
        <TestForm
          initialState={initialState}
          indexPatternFields={indexPatternFields}
          onSubmit={handleSubmit}
        />
      );

      await submitForm();

      expect(handleSubmit).toHaveBeenCalledWith({
        data: [{ name: 'field1', type: 'string' }],
        isValid: true,
      });
    });

    it('submits updated required fields', async () => {
      const initialState: RequiredFieldWithOptionalEcs[] = [{ name: 'field1', type: 'string' }];

      const indexPatternFields: DataViewFieldBase[] = [
        createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
        createIndexPatternField({ name: 'field2', esTypes: ['keyword', 'date'] }),
      ];

      const handleSubmit = jest.fn();

      render(
        <TestForm
          initialState={initialState}
          indexPatternFields={indexPatternFields}
          onSubmit={handleSubmit}
        />
      );

      await selectEuiComboBoxOption({
        comboBoxToggleButton: getSelectToggleButtonForName('field1'),
        optionText: 'field2',
      });

      await selectEuiComboBoxOption({
        comboBoxToggleButton: getSelectToggleButtonForType('keyword'),
        optionText: 'date',
      });

      await submitForm();

      expect(handleSubmit).toHaveBeenCalledWith({
        data: [{ name: 'field2', type: 'date' }],
        isValid: true,
      });
    });

    it('submits a form with warnings', async () => {
      const initialState: RequiredFieldWithOptionalEcs[] = [
        { name: 'name-that-does-not-exist', type: 'type-that-does-not-exist' },
      ];

      const indexPatternFields: DataViewFieldBase[] = [
        createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
      ];

      const handleSubmit = jest.fn();

      render(
        <TestForm
          initialState={initialState}
          indexPatternFields={indexPatternFields}
          onSubmit={handleSubmit}
        />
      );

      expect(
        screen.queryByText('Some fields are not found within specified index patterns.')
      ).toBeVisible();

      await submitForm();

      expect(handleSubmit).toHaveBeenCalledWith({
        data: [{ name: 'name-that-does-not-exist', type: 'type-that-does-not-exist' }],
        isValid: true,
      });
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

async function getDropdownOptions(dropdownToggleButton: HTMLElement): Promise<string[]> {
  await showEuiComboBoxOptions(dropdownToggleButton);

  const options = screen.getAllByRole('option').map((option) => option.textContent) as string[];

  fireEvent.click(dropdownToggleButton);

  return options;
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

type SelectEuiComboBoxOptionParameters =
  | {
      comboBoxToggleButton: HTMLElement;
      optionIndex: number;
      optionText?: undefined;
    }
  | {
      comboBoxToggleButton: HTMLElement;
      optionText: string;
      optionIndex?: undefined;
    };

function selectEuiComboBoxOption({
  comboBoxToggleButton,
  optionIndex,
  optionText,
}: SelectEuiComboBoxOptionParameters): Promise<void> {
  return act(async () => {
    await showEuiComboBoxOptions(comboBoxToggleButton);

    const options = screen.getAllByRole('option');

    if (typeof optionText === 'string') {
      const optionToSelect = options.find((option) => option.textContent === optionText);

      if (optionToSelect) {
        fireEvent.click(optionToSelect);
      } else {
        throw new Error(
          `Could not find option with text "${optionText}". Available options: ${options
            .map((option) => option.textContent)
            .join(', ')}`
        );
      }
    } else {
      fireEvent.click(options[optionIndex]);
    }
  });
}

function selectFirstEuiComboBoxOption({
  comboBoxToggleButton,
}: {
  comboBoxToggleButton: HTMLElement;
}): Promise<void> {
  return selectEuiComboBoxOption({ comboBoxToggleButton, optionIndex: 0 });
}

function getSelectToggleButtonForName(value: string): HTMLElement {
  return screen
    .getByTestId(`requiredFieldNameSelect-${value}`)
    .querySelector('[data-test-subj="comboBoxToggleListButton"]') as HTMLElement;
}

function getSelectToggleButtonForType(value: string): HTMLElement {
  return screen
    .getByTestId(`requiredFieldTypeSelect-${value}`)
    .querySelector('[data-test-subj="comboBoxToggleListButton"]') as HTMLElement;
}

function submitForm(): Promise<void> {
  return act(async () => {
    fireEvent.click(screen.getByText('Submit'));
  });
}

interface TestFormProps {
  initialState?: RequiredFieldWithOptionalEcs[];
  onSubmit?: (args: { data: RequiredFieldWithOptionalEcs[]; isValid: boolean }) => void;
  indexPatternFields?: DataViewFieldBase[];
  isIndexPatternLoading?: boolean;
}

function TestForm({
  indexPatternFields,
  initialState,
  isIndexPatternLoading,
  onSubmit,
}: TestFormProps): JSX.Element {
  const { form } = useForm({
    options: { stripEmptyFields: true },
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
      <RequiredFields
        path="requiredFieldsField"
        indexPatternFields={indexPatternFields}
        isIndexPatternLoading={isIndexPatternLoading}
      />
      <button type="button" onClick={form.submit}>
        {'Submit'}
      </button>
    </Form>
  );
}
