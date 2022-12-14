/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { TestProvider } from '../../test/test_provider';
import userEvent from '@testing-library/user-event';
import { InlineRadioGroup } from './inline_radio_group';
import Chance from 'chance';

const chance = new Chance();

describe('<InlineRadioGroup />', () => {
  const onChange = jest.fn();

  const options: Array<{ id: string; label: string; disabled: boolean }> = chance
    .unique(chance.string, 3)
    .map((id: string, i) => ({
      id,
      label: id,
      disabled: i === 1,
    }));
  const idSelected = options[0].id;

  const Component = () => (
    <TestProvider>
      <InlineRadioGroup idSelected={idSelected} options={options} onChange={onChange} />
    </TestProvider>
  );

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders all options', () => {
    const { getByText } = render(<Component />);

    options.forEach((option) => {
      const input = getByText(option.label, { selector: 'button span' }).querySelector('input');
      // Option
      expect(input).toBeInTheDocument();

      // Disabled
      if (option.disabled) {
        expect(input).toBeDisabled();
      }

      // Selected
      if (option.id === idSelected) {
        expect(input).toBeChecked();
      }
    });
  });

  it('calls onChange', () => {
    const { getByText } = render(<Component />);

    const span = getByText(options[0].label, { selector: 'button span' });
    userEvent.click(span);

    expect(onChange).toHaveBeenCalledWith(options[0].id);
  });
});
