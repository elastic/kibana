/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent } from '@testing-library/react';
import React from 'react';
import { render } from '../../../utils/testing/rtl_helpers';
import { FormattedComboBox } from './combo_box';

describe('<FormattedComboBox />', () => {
  const onChange = jest.fn();
  const selectedOptions: string[] = [];

  it('renders ComboBox', () => {
    const { getByTestId } = render(
      <FormattedComboBox selectedOptions={selectedOptions} onChange={onChange} />
    );

    expect(getByTestId('syntheticsFleetComboBox')).toBeInTheDocument();
  });

  it('calls onBlur', () => {
    const onBlur = jest.fn();
    const { getByTestId } = render(
      <FormattedComboBox selectedOptions={selectedOptions} onChange={onChange} onBlur={onBlur} />
    );

    const combobox = getByTestId('syntheticsFleetComboBox');
    fireEvent.focus(combobox);
    fireEvent.blur(combobox);

    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
