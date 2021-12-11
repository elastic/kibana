/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { CalloutGroup } from './callout_group';

describe('Callout Group', () => {
  test('renders errors', () => {
    render(<CalloutGroup items={['error1', 'error2']} isError />);
    expect(screen.getAllByTestId('preview-error')[0]).toHaveTextContent('error1');
    expect(screen.getAllByTestId('preview-error')[1]).toHaveTextContent('error2');
  });

  test('renders warnings', () => {
    render(<CalloutGroup items={['warning1', 'warning2']} />);
    expect(screen.getAllByTestId('preview-warning')[0]).toHaveTextContent('warning1');
    expect(screen.getAllByTestId('preview-warning')[1]).toHaveTextContent('warning2');
  });
});
