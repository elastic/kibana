/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { screen, render, act, fireEvent, waitFor } from '@testing-library/react';
import { Form, useForm } from '../../../../shared_imports';

import type { DataViewFieldBase } from '@kbn/es-query';
import { RequiredFields } from './required_fields';
import type { RequiredFieldInput } from '../../../../../common/api/detection_engine';

const ADD_REQUIRED_FIELD_BUTTON_TEST_ID = 'addRequiredFieldButton';
const REQUIRED_FIELDS_GENERAL_WARNING_TEST_ID = 'requiredFieldsGeneralWarning';

describe('RequiredFields form part', () => {
  it('displays the required fields label', () => {
    render(<TestForm />);

    expect(screen.getByText('Required fields'));
  });

  it('displays previously saved required fields', () => {
    const initialState = [
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

    render(<TestForm indexPatternFields={indexPatternFields} />);

    await addRequiredFieldRow();
    await selectFirstEuiComboBoxOption({
      comboBoxToggleButton: getSelectToggleButtonForName('empty'),
    });

    expect(screen.getByDisplayValue('field1')).toBeVisible();
    expect(screen.getByDisplayValue('string')).toBeVisible();
  });

  it('user can add a new required field to a previously saved form', async () => {
    const initialState = [{ name: 'field1', type: 'string' }];

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

    render(<TestForm indexPatternFields={indexPatternFields} />);

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

  it('user can add his own custom field name and type', async () => {
    render(<TestForm indexPatternFields={[]} />);

    await addRequiredFieldRow();

    await typeInCustomComboBoxOption({
      comboBoxToggleButton: getSelectToggleButtonForName('empty'),
      optionText: 'customField',
    });

    expect(screen.getByDisplayValue('customField')).toBeVisible();

    await typeInCustomComboBoxOption({
      comboBoxToggleButton: getSelectToggleButtonForType('empty'),
      optionText: 'customType',
    });

    expect(screen.getByDisplayValue('customType')).toBeVisible();
    expect(screen.queryByTestId(REQUIRED_FIELDS_GENERAL_WARNING_TEST_ID)).toBeVisible();
  });

  it('field type dropdown allows to choose from options if multiple types are available', async () => {
    const initialState = [{ name: 'field1', type: 'string' }];

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

  it('user can remove a required field', async () => {
    const initialState = [{ name: 'field1', type: 'string' }];

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
    const initialState = [{ name: 'field1', type: 'string' }];

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
    render(<TestForm indexPatternFields={undefined} isIndexPatternLoading={true} />);

    expect(screen.getByTestId(ADD_REQUIRED_FIELD_BUTTON_TEST_ID)).toBeDisabled();
  });

  it('adding a new required field is disabled when an empty row is already displayed', async () => {
    const indexPatternFields: DataViewFieldBase[] = [
      createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
    ];

    render(<TestForm indexPatternFields={indexPatternFields} />);

    expect(screen.getByTestId(ADD_REQUIRED_FIELD_BUTTON_TEST_ID)).toBeEnabled();

    await addRequiredFieldRow();

    expect(screen.getByTestId(ADD_REQUIRED_FIELD_BUTTON_TEST_ID)).toBeDisabled();
  });

  describe('warnings', () => {
    it('displays a warning when a selected field name is not found within index patterns', async () => {
      const initialState = [{ name: 'field-that-does-not-exist', type: 'keyword' }];

      const indexPatternFields: DataViewFieldBase[] = [
        createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
      ];

      render(<TestForm initialState={initialState} indexPatternFields={indexPatternFields} />);

      expect(screen.getByTestId(REQUIRED_FIELDS_GENERAL_WARNING_TEST_ID)).toBeVisible();

      expect(
        screen.getByText(
          `Field "field-that-does-not-exist" is not found within the rule's specified index patterns`
        )
      ).toBeVisible();

      const nameWarningIcon = screen
        .getByTestId(`requiredFieldNameSelect-field-that-does-not-exist`)
        .querySelector('[data-euiicon-type="warning"]');

      expect(nameWarningIcon).toBeVisible();

      /* Make sure only one warning icon is displayed - the one for name */
      expect(document.querySelectorAll('[data-test-subj="warningIcon"]')).toHaveLength(1);
    });

    it('displays a warning when a selected field type is not found within index patterns', async () => {
      const initialState = [{ name: 'field1', type: 'type-that-does-not-exist' }];

      const indexPatternFields: DataViewFieldBase[] = [
        createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
      ];

      render(<TestForm initialState={initialState} indexPatternFields={indexPatternFields} />);

      expect(screen.getByTestId(REQUIRED_FIELDS_GENERAL_WARNING_TEST_ID)).toBeVisible();

      expect(
        screen.getByText(
          `Field "field1" with type "type-that-does-not-exist" is not found within the rule's specified index patterns`
        )
      ).toBeVisible();

      const typeWarningIcon = screen
        .getByTestId(`requiredFieldTypeSelect-type-that-does-not-exist`)
        .querySelector('[data-euiicon-type="warning"]');

      expect(typeWarningIcon).toBeVisible();

      /* Make sure only one warning icon is displayed - the one for type */
      expect(document.querySelectorAll('[data-test-subj="warningIcon"]')).toHaveLength(1);
    });

    it('displays a warning only for field name when both field name and type are not found within index patterns', async () => {
      const initialState = [
        { name: 'field-that-does-not-exist', type: 'type-that-does-not-exist' },
      ];

      const indexPatternFields: DataViewFieldBase[] = [
        createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
      ];

      render(<TestForm initialState={initialState} indexPatternFields={indexPatternFields} />);

      expect(screen.getByTestId(REQUIRED_FIELDS_GENERAL_WARNING_TEST_ID)).toBeVisible();

      expect(
        screen.getByText(
          `Field "field-that-does-not-exist" is not found within the rule's specified index patterns`
        )
      ).toBeVisible();

      const nameWarningIcon = screen
        .getByTestId(`requiredFieldNameSelect-field-that-does-not-exist`)
        .querySelector('[data-euiicon-type="warning"]');

      expect(nameWarningIcon).toBeVisible();

      /* Make sure only one warning icon is displayed - the one for name */
      expect(document.querySelectorAll('[data-test-subj="warningIcon"]')).toHaveLength(1);
    });

    it(`doesn't display a warning when all selected fields are found within index patterns`, async () => {
      const initialState = [{ name: 'field1', type: 'string' }];

      const indexPatternFields: DataViewFieldBase[] = [
        createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
      ];

      render(<TestForm initialState={initialState} indexPatternFields={indexPatternFields} />);

      expect(screen.queryByTestId(REQUIRED_FIELDS_GENERAL_WARNING_TEST_ID)).toBeNull();
    });

    it(`doesn't display a warning for an empty row`, async () => {
      const indexPatternFields: DataViewFieldBase[] = [
        createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
      ];

      render(<TestForm indexPatternFields={indexPatternFields} />);

      await addRequiredFieldRow();

      expect(screen.queryByTestId(REQUIRED_FIELDS_GENERAL_WARNING_TEST_ID)).toBeNull();
    });

    it(`doesn't display a warning when field is invalid`, async () => {
      render(<TestForm />);

      await addRequiredFieldRow();

      await typeInCustomComboBoxOption({
        comboBoxToggleButton: getSelectToggleButtonForName('empty'),
        optionText: 'customField',
      });

      expect(screen.getByText('Field type is required')).toBeVisible();

      expect(screen.queryByTestId(`customField-warningText`)).toBeNull();
    });
  });

  describe('validation', () => {
    it('form is invalid when only field name is empty', async () => {
      render(<TestForm />);

      await addRequiredFieldRow();

      await typeInCustomComboBoxOption({
        comboBoxToggleButton: getSelectToggleButtonForType('empty'),
        optionText: 'customType',
      });

      expect(screen.getByText('Field name is required')).toBeVisible();

      await typeInCustomComboBoxOption({
        comboBoxToggleButton: getSelectToggleButtonForName('empty'),
        optionText: 'customField',
      });

      expect(screen.queryByText('Field name is required')).toBeNull();
    });

    it('form is invalid when only field type is empty', async () => {
      render(<TestForm />);

      await addRequiredFieldRow();

      await typeInCustomComboBoxOption({
        comboBoxToggleButton: getSelectToggleButtonForName('empty'),
        optionText: 'customField',
      });

      expect(screen.getByText('Field type is required')).toBeVisible();

      await typeInCustomComboBoxOption({
        comboBoxToggleButton: getSelectToggleButtonForType('empty'),
        optionText: 'customType',
      });

      expect(screen.queryByText('Field type is required')).toBeNull();
    });

    it('form is invalid when same field name is selected more than once', async () => {
      const initialState = [{ name: 'field1', type: 'string' }];

      const indexPatternFields: DataViewFieldBase[] = [
        createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
        createIndexPatternField({ name: 'field2', esTypes: ['string'] }),
      ];

      render(<TestForm initialState={initialState} indexPatternFields={indexPatternFields} />);

      await addRequiredFieldRow();

      await typeInCustomComboBoxOption({
        comboBoxToggleButton: getSelectToggleButtonForName('empty'),
        optionText: 'field1',
      });

      expect(screen.getByText('Field name "field1" is already used')).toBeVisible();

      await typeInCustomComboBoxOption({
        comboBoxToggleButton: getLastSelectToggleButtonForName(),
        optionText: 'field2',
      });

      expect(screen.queryByText('Field name "field1" is already used')).toBeNull();
    });

    it('form is valid when both field name and type are empty', async () => {
      const handleSubmit = jest.fn();

      render(<TestForm onSubmit={handleSubmit} />);

      await addRequiredFieldRow();

      await submitForm();

      expect(handleSubmit).toHaveBeenCalledWith({
        data: [{ name: '', type: '' }],
        isValid: true,
      });
    });
  });

  describe('form submission', () => {
    it('submits undefined when no required fields are selected', async () => {
      const handleSubmit = jest.fn();

      render(<TestForm onSubmit={handleSubmit} />);

      await submitForm();

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith({
          data: undefined,
          isValid: true,
        });
      });
    });

    it('submits undefined when all selected fields were removed', async () => {
      const initialState = [{ name: 'field1', type: 'string' }];

      const handleSubmit = jest.fn();

      render(<TestForm initialState={initialState} onSubmit={handleSubmit} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('removeRequiredFieldButton-field1'));
      });

      await submitForm();

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith({
          data: undefined,
          isValid: true,
        });
      });
    });

    it('submits newly added required fields', async () => {
      const indexPatternFields: DataViewFieldBase[] = [
        createIndexPatternField({ name: 'field1', esTypes: ['string'] }),
      ];

      const handleSubmit = jest.fn();

      render(<TestForm indexPatternFields={indexPatternFields} onSubmit={handleSubmit} />);

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
      const initialState = [{ name: 'field1', type: 'string' }];

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
      const initialState = [{ name: 'field1', type: 'string' }];

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
      const initialState = [{ name: 'name-that-does-not-exist', type: 'type-that-does-not-exist' }];

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

      expect(screen.queryByTestId(REQUIRED_FIELDS_GENERAL_WARNING_TEST_ID)).toBeVisible();

      await submitForm();

      expect(handleSubmit).toHaveBeenCalledWith({
        data: [{ name: 'name-that-does-not-exist', type: 'type-that-does-not-exist' }],
        isValid: true,
      });
    });
  });
});

export function createIndexPatternField(overrides: Partial<DataViewFieldBase>): DataViewFieldBase {
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

export function addRequiredFieldRow(): Promise<void> {
  return act(async () => {
    fireEvent.click(screen.getByText('Add required field'));
  });
}

function showEuiComboBoxOptions(comboBoxToggleButton: HTMLElement): Promise<void> {
  fireEvent.click(comboBoxToggleButton);

  return waitFor(() => {
    const listWithOptionsElement = document.querySelector('[role="listbox"]');
    const emptyListElement = document.querySelector('.euiComboBoxOptionsList__empty');

    expect(listWithOptionsElement || emptyListElement).toBeInTheDocument();
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

    const options = Array.from(
      document.querySelectorAll('[data-test-subj*="comboBoxOptionsList"] [role="option"]')
    );

    if (typeof optionText === 'string') {
      const optionToSelect = options.find((option) => option.textContent === optionText);

      if (!optionToSelect) {
        throw new Error(
          `Could not find option with text "${optionText}". Available options: ${options
            .map((option) => option.textContent)
            .join(', ')}`
        );
      }

      fireEvent.click(optionToSelect);
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

function typeInCustomComboBoxOption({
  comboBoxToggleButton,
  optionText,
}: {
  comboBoxToggleButton: HTMLElement;
  optionText: string;
}) {
  return act(async () => {
    await showEuiComboBoxOptions(comboBoxToggleButton);

    fireEvent.change(document.activeElement as HTMLInputElement, { target: { value: optionText } });
    fireEvent.keyDown(document.activeElement as HTMLInputElement, { key: 'Enter' });
  });
}

function getLastSelectToggleButtonForName(): HTMLElement {
  const allNameSelects = screen.getAllByTestId(/requiredFieldNameSelect-.*/);
  const lastNameSelect = allNameSelects[allNameSelects.length - 1];

  return lastNameSelect.querySelector('[data-test-subj="comboBoxToggleListButton"]') as HTMLElement;
}

export function getSelectToggleButtonForName(value: string): HTMLElement {
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
  initialState?: RequiredFieldInput[];
  onSubmit?: (args: { data: RequiredFieldInput[]; isValid: boolean }) => void;
  indexPatternFields?: DataViewFieldBase[];
  isIndexPatternLoading?: boolean;
}

function TestForm({
  indexPatternFields,
  initialState = [],
  isIndexPatternLoading,
  onSubmit,
}: TestFormProps): JSX.Element {
  const { form } = useForm({
    defaultValue: {
      requiredFieldsField: initialState,
    },
    onSubmit: async (formData, isValid) =>
      onSubmit?.({ data: formData.requiredFieldsField, isValid }),
  });

  return (
    <I18nProvider>
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
    </I18nProvider>
  );
}
