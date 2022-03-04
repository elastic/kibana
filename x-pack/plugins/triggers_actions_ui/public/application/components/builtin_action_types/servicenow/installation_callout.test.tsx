/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { InstallationCallout } from './installation_callout';

const appId = 'test';

describe('DeprecatedCallout', () => {
  test('it renders correctly', () => {
    render(<InstallationCallout appId={appId} />);
    expect(
      screen.getByText(
        'To use this connector, first install the Elastic app from the ServiceNow app store.'
      )
    ).toBeInTheDocument();
  });

  test('it renders the button', () => {
    render(<InstallationCallout appId={appId} />);
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  it('should render with correct href for the ServiceNow store button', () => {
    render(<InstallationCallout appId={appId} />);
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://store.servicenow.com/sn_appstore_store.do#!/store/application/test'
    );
  });
});
