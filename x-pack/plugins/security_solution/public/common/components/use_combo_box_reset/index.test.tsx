/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { useCallback, useMemo, useState } from 'react';

import { useEuiComboBoxReset } from '.';

const options = [
  {
    label: 'foo',
  },
  {
    label: 'bar',
  },
  {
    label: 'baz',
  },
];

describe('useEuiComboBoxReset', () => {
  test(`it resets the input, even when the EuiComboBox has validation errors, when 'onReset()' is invoked'`, () => {
    const invalidValue = 'this is NOT an option, bub';

    const EuiComboBoxResetTest = () => {
      const [selectedOptions, setSelected] = useState([options[0]]);
      const onChange = useCallback(
        (selected: Array<EuiComboBoxOptionOption<string | number | string[] | undefined>>) => {
          setSelected(selected);
        },
        []
      );
      const singleSelection = useMemo(() => {
        return { asPlainText: true };
      }, []);

      const { comboboxRef, onReset, setComboboxInputRef } = useEuiComboBoxReset();

      return (
        <>
          <EuiComboBox
            aria-label="test"
            inputRef={setComboboxInputRef} // from useEuiComboBoxReset
            isClearable={false}
            ref={comboboxRef} // from useEuiComboBoxReset
            selectedOptions={selectedOptions}
            singleSelection={singleSelection}
            sortMatchesBy="startsWith"
            onChange={onChange}
            options={options}
          />

          <button aria-label="Reset" onClick={() => onReset()} type="button">
            {'Reset'}
          </button>
        </>
      );
    };

    render(<EuiComboBoxResetTest />);

    const initialValue = screen.getByRole('combobox');
    expect(initialValue).toHaveValue(options[0].label);

    // update the EuiComboBox input to an invalid value:
    const searchInput = screen.getByRole('combobox'); // the actual <input /> controlled by EuiComboBox
    fireEvent.change(searchInput, { target: { value: invalidValue } });

    const afterInvalidInput = screen.getByRole('combobox');
    expect(searchInput).toHaveValue(invalidValue); // the EuiComboBox is now in the "error state"
    expect(afterInvalidInput).not.toHaveTextContent(invalidValue); // Value should not have been applied

    const resetButton = screen.getByRole('button', { name: 'Reset' });
    fireEvent.click(resetButton); // clicking invokes onReset()

    const afterReset = screen.getByRole('combobox');
    expect(afterReset).toHaveValue(options[0].label); // back to the default
  });
});
