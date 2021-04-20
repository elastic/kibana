/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../lib/helper/rtl_helpers';
import { ComboBox } from './combo_box';

describe('<ComboBox />', () => {
  const onChange = jest.fn();
  const selectedOptions: string[] = [];

  it('renders ComboBox', () => {
    const { getByTestId } = render(
      <ComboBox selectedOptions={selectedOptions} onChange={onChange} />
    );

    expect(getByTestId('syntheticsFleetComboBox')).toBeInTheDocument();
  });
});
