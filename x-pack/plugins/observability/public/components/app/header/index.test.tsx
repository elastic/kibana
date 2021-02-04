/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../utils/test_helper';
import { Header } from './';

describe('Header', () => {
  it('renders', () => {
    const { getByText, getByTestId } = render(<Header color="#fff" />);
    expect(getByTestId('observability-logo')).toBeInTheDocument();
    expect(getByText('Observability')).toBeInTheDocument();
  });
});
