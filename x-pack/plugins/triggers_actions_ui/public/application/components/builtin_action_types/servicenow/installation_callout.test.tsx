/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { InstallationCallout } from './installation_callout';

describe('DeprecatedCallout', () => {
  test('it renders correctly', () => {
    render(<InstallationCallout />);
    expect(
      screen.getByText(
        'To use this connector, you must first install the Elastic App from the ServiceNow App Store'
      )
    ).toBeInTheDocument();
  });

  test('it renders the button', () => {
    render(<InstallationCallout />);
    expect(screen.getByRole('link')).toBeInTheDocument();
  });
});
