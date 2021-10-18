/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SNStoreButton, SNStoreLink } from './sn_store_button';

describe('SNStoreButton', () => {
  it('should render the button', () => {
    render(<SNStoreButton color="warning" />);
    expect(screen.getByText('Visit ServiceNow app store')).toBeInTheDocument();
  });

  it('should render a danger button', () => {
    render(<SNStoreButton color="danger" />);
    expect(screen.getByRole('link')).toHaveClass('euiButton--danger');
  });

  it('should render with correct href', () => {
    render(<SNStoreButton color="warning" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://store.servicenow.com/');
  });

  it('should render with target blank', () => {
    render(<SNStoreButton color="warning" />);
    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
  });
});

describe('SNStoreLink', () => {
  it('should render the link', () => {
    render(<SNStoreLink />);
    expect(screen.getByText('Visit ServiceNow app store')).toBeInTheDocument();
  });

  it('should render with correct href', () => {
    render(<SNStoreLink />);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://store.servicenow.com/');
  });

  it('should render with target blank', () => {
    render(<SNStoreLink />);
    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
  });
});
