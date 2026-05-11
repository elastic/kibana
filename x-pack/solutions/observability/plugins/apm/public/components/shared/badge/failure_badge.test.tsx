/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FailureBadge } from './failure_badge';

describe('FailureBadge', () => {
  it('renders the failure badge when outcome is "failure"', () => {
    render(<FailureBadge outcome="failure" />);
    expect(screen.getByText('failure')).toBeInTheDocument();
  });

  it('shows the tooltip on hover when outcome is "failure"', async () => {
    const user = userEvent.setup();
    render(<FailureBadge outcome="failure" />);

    const badge = screen.getByText('failure');
    await user.hover(badge);

    expect(await screen.findByText('event.outcome = failure')).toBeInTheDocument();
  });

  it('does not render when outcome is "success"', () => {
    const { container } = render(<FailureBadge outcome="success" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render when outcome is "unknown"', () => {
    const { container } = render(<FailureBadge outcome="unknown" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render when outcome is undefined', () => {
    const { container } = render(<FailureBadge />);
    expect(container).toBeEmptyDOMElement();
  });
});
