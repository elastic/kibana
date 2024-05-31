/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FieldSelect, FieldSelectProps } from './field_select';
import { RenderOptions, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Layer Data Panel', () => {
  let defaultProps: FieldSelectProps;

  beforeEach(() => {
    defaultProps = {
      selectedField: {
        fieldName: 'bytes',
        columnId: 'bytes',
        meta: {
          type: 'number',
        },
      },
      existingFields: [
        {
          name: 'timestamp',
          id: 'timestamp',
          meta: {
            type: 'date',
          },
          compatible: true,
        },
        {
          name: 'bytes',
          id: 'bytes',
          meta: {
            type: 'number',
          },
          compatible: true,
        },
        {
          name: 'memory',
          id: 'memory',
          meta: {
            type: 'number',
          },
          compatible: true,
        },
      ],
      onChoose: jest.fn(),
    };
  });

  const renderFieldSelect = (props?: Partial<FieldSelectProps>, renderOptions?: RenderOptions) => {
    const rtlRender = render(<FieldSelect {...defaultProps} {...props} />, renderOptions);
    return {
      ...rtlRender,
      comboboxInput: screen.getByRole('combobox'),
      getAllOptions: () =>
        within(screen.getByRole('listbox'))
          .getAllByRole('option')
          .map((option) => option.textContent),
    };
  };

  it('should display the selected field if given', () => {
    const { comboboxInput } = renderFieldSelect();
    expect(comboboxInput).toHaveValue('bytes');
  });

  it('should list all the fields', () => {
    const { comboboxInput, getAllOptions } = renderFieldSelect();
    userEvent.click(comboboxInput);
    const options = getAllOptions();
    expect(options).toEqual(['timestamp', 'bytes', 'memory']);
  });
  it('user can remove the value from the input', () => {
    const { comboboxInput } = renderFieldSelect();
    userEvent.click(comboboxInput);
    expect(comboboxInput).toHaveValue('bytes');
    // type into input
    userEvent.type(comboboxInput, '{backspace}{backspace}{backspace}{backspace}{backspace}');
    expect(comboboxInput).toHaveValue('');
  });
  describe('behavior on blur', () => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <div>
        <button>testing blur by clicking outside button</button>
        {children}
      </div>
    );

    it('when user blurs the empty input, the input receives selected field', () => {
      const { comboboxInput } = renderFieldSelect(undefined, { wrapper: Wrapper });
      userEvent.click(comboboxInput);
      expect(comboboxInput).toHaveValue('bytes');
      // type into input
      userEvent.type(comboboxInput, '{backspace}{backspace}{backspace}{backspace}{backspace}');
      expect(comboboxInput).toHaveValue('');
      userEvent.click(
        screen.getByRole('button', { name: /testing blur by clicking outside button/i })
      );
      expect(comboboxInput).toHaveValue('bytes');
    });
    it('when user blurs non-empty input, the value persists', () => {
      const { comboboxInput } = renderFieldSelect(undefined, { wrapper: Wrapper });
      userEvent.click(comboboxInput);
      expect(comboboxInput).toHaveValue('bytes');
      // type into input
      userEvent.type(comboboxInput, '{backspace}{backspace}{backspace}');
      expect(comboboxInput).toHaveValue('by');
      userEvent.click(
        screen.getByRole('button', { name: /testing blur by clicking outside button/i })
      );
      expect(comboboxInput).toHaveValue('by');
    });
  });
});
