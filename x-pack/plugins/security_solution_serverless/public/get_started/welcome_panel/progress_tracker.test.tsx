/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ProgressTracker } from './progress_tracker'; // Replace with your import path

describe('ProgressTracker', () => {
  it('renders nothing when totalActiveSteps and totalStepsLeft are null', () => {
    const { container } = render(<ProgressTracker />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when totalActiveSteps is null', () => {
    const { container } = render(<ProgressTracker totalStepsLeft={5} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when totalStepsLeft is null', () => {
    const { container } = render(<ProgressTracker totalActiveSteps={10} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the progress description when both totalActiveSteps and totalStepsLeft are provided', () => {
    const { getByText } = render(<ProgressTracker totalActiveSteps={10} totalStepsLeft={5} />);
    expect(getByText('5 of 10')).toBeInTheDocument();
  });
});
