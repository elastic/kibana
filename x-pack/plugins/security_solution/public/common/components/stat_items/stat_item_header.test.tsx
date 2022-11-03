/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { StatItemHeader } from './stat_item_header';

describe('StatItemHeader', () => {
  const mockToggle = jest.fn();

  beforeEach(() => {});

  it('renders expand button', () => {
    const { getByRole } = render(<StatItemHeader toggle={mockToggle} toggleStatus={true} />);
    expect(getByRole('button')).toHaveAttribute('title', 'Open');
  });

  it('renders collapse button', () => {
    const { getByRole } = render(<StatItemHeader toggle={mockToggle} toggleStatus={false} />);
    expect(getByRole('button')).toHaveAttribute('title', 'Closed');
  });
});
