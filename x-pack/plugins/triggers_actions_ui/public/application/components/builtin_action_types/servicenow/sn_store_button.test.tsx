/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SNStoreButton } from './sn_store_button';

describe('SNStoreButton', () => {
  test('it renders the button', () => {
    render(<SNStoreButton color="warning" />);
    expect(screen.getByText('Visit ServiceNow app store')).toBeInTheDocument();
  });

  test('it renders a danger button', () => {
    render(<SNStoreButton color="danger" />);
    expect(screen.getByRole('link')).toHaveClass('euiButton--danger');
  });

  test('it renders with correct href', () => {
    render(<SNStoreButton color="warning" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://store.servicenow.com/');
  });
});
