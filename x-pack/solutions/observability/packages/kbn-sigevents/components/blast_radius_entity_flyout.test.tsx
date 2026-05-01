/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { BlastRadiusEntityFlyout } from './blast_radius_entity_flyout';

const renderWithIntl = (ui: React.ReactElement) => {
  return render(<IntlProvider locale="en">{ui}</IntlProvider>);
};

describe('BlastRadiusEntityFlyout', () => {
  const defaultProps = {
    title: 'Critically affected entities',
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with the correct title', () => {
    renderWithIntl(<BlastRadiusEntityFlyout {...defaultProps} />);
    expect(screen.getByText('Critically affected entities')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    renderWithIntl(<BlastRadiusEntityFlyout {...defaultProps} />);
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders prototype body text', () => {
    renderWithIntl(<BlastRadiusEntityFlyout {...defaultProps} />);
    expect(screen.getByText(/Detail view for affected entity/i)).toBeInTheDocument();
  });

  it('renders sample fields description', () => {
    renderWithIntl(<BlastRadiusEntityFlyout {...defaultProps} />);
    expect(
      screen.getByText(/Sample fields: affected services, hosts, dependencies/i)
    ).toBeInTheDocument();
  });

  it('has the correct test subject', () => {
    const { container } = renderWithIntl(<BlastRadiusEntityFlyout {...defaultProps} />);
    expect(
      container.querySelector('[data-test-subj="sigeventsOverviewBlastRadiusEntityFlyout"]')
    ).toBeInTheDocument();
  });
});
