/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Bar } from './bar';

describe('Bar', () => {
  it('renders with correct width, left, and color styles', () => {
    const { container } = render(<Bar width={50} left={10} color="red" />);
    const barDiv = container.firstChild as HTMLElement;
    expect(barDiv).toBeInTheDocument();
    expect(barDiv).toHaveStyle('width: 50%');
    expect(barDiv).toHaveStyle('margin-left: 10%');
    expect(barDiv).toHaveStyle('background-color: red');
    expect(barDiv).toHaveStyle('height: 12px');
  });

  it('renders with 0 width and left', () => {
    const { container } = render(<Bar width={0} left={0} color="blue" />);
    const barDiv = container.firstChild as HTMLElement;
    expect(barDiv).toHaveStyle('width: 0%');
    expect(barDiv).toHaveStyle('margin-left: 0%');
    expect(barDiv).toHaveStyle('background-color: blue');
  });

  it('renders with 100% width and 100% left', () => {
    const { container } = render(<Bar width={100} left={100} color="#fff" />);
    const barDiv = container.firstChild as HTMLElement;
    expect(barDiv).toHaveStyle('width: 100%');
    expect(barDiv).toHaveStyle('margin-left: 100%');
    expect(barDiv).toHaveStyle('background-color: #fff');
  });
});
