/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ImpactBar } from '.';
import { renderWithTheme } from '../../../utils/test_helpers';
import { screen } from '@testing-library/react';

describe('ImpactBar', () => {
  it('should render with default values', () => {
    renderWithTheme(<ImpactBar value={25} data-test-subj="impact-bar" />);

    const bar = screen.getByTestId('impact-bar');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveStyle({ width: '96px' });
  });

  it('should render with custom values', () => {
    renderWithTheme(
      <ImpactBar value={2} max={5} color="danger" size="s" data-test-subj="impact-bar" />
    );

    const bar = screen.getByTestId('impact-bar');

    expect(bar).toBeInTheDocument();
    expect(bar).toHaveStyle({ width: '96px' });
    expect(bar.className).toContain('danger');
    expect(bar).toHaveAttribute('max', '5');
    expect(bar).toHaveAttribute('value', '2');
  });
});
