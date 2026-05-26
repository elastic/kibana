/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CriticalityDonut } from './criticality_donut';

describe('CriticalityDonut', () => {
  it('renders with the correct score', () => {
    render(<CriticalityDonut score={75} />);
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('clamps score to 0-100 range', () => {
    render(<CriticalityDonut score={150} />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('displays score of 0', () => {
    render(<CriticalityDonut score={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('uses custom size when provided', () => {
    const { container } = render(<CriticalityDonut score={50} size={150} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '150');
    expect(svg).toHaveAttribute('height', '150');
  });

  it('has appropriate aria-label for accessibility', () => {
    render(<CriticalityDonut score={85} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Severity score 85 out of 100');
  });
});
