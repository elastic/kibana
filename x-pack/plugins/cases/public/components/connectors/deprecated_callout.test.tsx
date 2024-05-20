/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DeprecatedCallout } from './deprecated_callout';

describe('DeprecatedCallout', () => {
  test('it renders correctly', () => {
    render(<DeprecatedCallout />);
    expect(screen.getByText('This connector type is deprecated')).toBeInTheDocument();
    expect(screen.getByText('Update this connector, or create a new one.')).toBeInTheDocument();
    expect(screen.getByTestId('deprecated-connector-warning-callout')).toHaveClass(
      'euiCallOut euiCallOut--warning'
    );
  });

  test('it renders a danger flyout correctly', () => {
    render(<DeprecatedCallout type="danger" />);
    expect(screen.getByTestId('deprecated-connector-warning-callout')).toHaveClass(
      'euiCallOut euiCallOut--danger'
    );
  });
});
