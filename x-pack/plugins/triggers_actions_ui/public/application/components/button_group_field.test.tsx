/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ButtonGroupField } from '../..';
import { render } from '@testing-library/react';
import { FormTestProvider } from './test_utils';

describe('ButtonGroupField', () => {
  it('renders an EuiButtonGroup when isButton prop is true', () => {
    const { getByRole } = render(
      <FormTestProvider>
        <ButtonGroupField path="test" label="Test" isButton={true} />
      </FormTestProvider>
    );
    const buttonGroup = getByRole('group');
    expect(buttonGroup).toBeInTheDocument();
  });

  it('renders an EuiSelect when isButton prop is false', () => {
    const { getByRole } = render(
      <FormTestProvider>
        <ButtonGroupField path="test" label="Test" isButton={false} />
      </FormTestProvider>
    );
    const select = getByRole('combobox');
    expect(select).toBeInTheDocument();
  });
});
