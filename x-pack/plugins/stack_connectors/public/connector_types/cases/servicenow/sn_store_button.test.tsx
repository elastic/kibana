/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SNStoreButton, SNStoreLink } from './sn_store_button';

const appId = 'test';

describe('SNStoreButton', () => {
  it('should render the button', () => {
    render(<SNStoreButton color="warning" appId={appId} />);
    expect(screen.getByText('Visit ServiceNow app store')).toBeInTheDocument();
  });

  it('should render a danger button', () => {
    render(<SNStoreButton color="danger" appId={appId} />);
    expect(screen.getByRole('link')).toHaveClass('euiButton--danger');
  });

  it('should render with correct href', () => {
    render(<SNStoreButton color="warning" appId={appId} />);
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://store.servicenow.com/sn_appstore_store.do#!/store/application/test'
    );
  });

  it('should render with target blank', () => {
    render(<SNStoreButton color="warning" appId={appId} />);
    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
  });
});

describe('SNStoreLink', () => {
  it('should render the link', () => {
    render(<SNStoreLink appId={appId} />);
    expect(screen.getByText('Visit ServiceNow app store')).toBeInTheDocument();
  });

  it('should render with correct href', () => {
    render(<SNStoreLink appId={appId} />);
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://store.servicenow.com/sn_appstore_store.do#!/store/application/test'
    );
  });

  it('should render with target blank', () => {
    render(<SNStoreLink appId={appId} />);
    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
  });
});
