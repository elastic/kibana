/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { SignificantEventSummary } from './significant_event_summary';

const baseProps = {
  requireAction: 4,
  inProgress: 2,
  resolved: 11,
  demoted: 3,
};

describe('SignificantEventSummary', () => {
  it('renders the four fixed categories with their counts', () => {
    render(<SignificantEventSummary {...baseProps} />);

    expect(screen.getByText('Require action')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByText('Demoted')).toBeInTheDocument();

    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('is presentational (no clickable buttons)', () => {
    render(<SignificantEventSummary {...baseProps} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders zero counts without crashing', () => {
    render(<SignificantEventSummary requireAction={0} inProgress={0} resolved={0} demoted={0} />);
    expect(screen.getAllByText('0')).toHaveLength(4);
  });
});
