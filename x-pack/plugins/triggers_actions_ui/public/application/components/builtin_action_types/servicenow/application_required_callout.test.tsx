/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ApplicationRequiredCallout } from './application_required_callout';

describe('ApplicationRequiredCallout', () => {
  test('it renders the callout', () => {
    render(<ApplicationRequiredCallout />);
    expect(screen.getByText('Elastic ServiceNow App not installed')).toBeInTheDocument();
    expect(
      screen.getByText('Please go to the ServiceNow app store and install the application')
    ).toBeInTheDocument();
  });

  test('it renders the ServiceNow store button', () => {
    render(<ApplicationRequiredCallout />);
    expect(screen.getByText('Visit ServiceNow app store')).toBeInTheDocument();
  });

  test('it renders an error message if provided', () => {
    render(<ApplicationRequiredCallout message="Denied" />);
    expect(screen.getByText('Error message: Denied')).toBeInTheDocument();
  });
});
