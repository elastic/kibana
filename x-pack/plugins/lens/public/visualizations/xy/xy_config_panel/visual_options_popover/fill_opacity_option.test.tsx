/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FillOpacityOption } from './fill_opacity_option';
import { render, screen } from '@testing-library/react';

describe('Line curve option', () => {
  it('should show currently selected opacity value', () => {
    render(<FillOpacityOption onChange={jest.fn()} value={0.3} />);
    expect(screen.getByLabelText('Fill opacity')).toHaveValue(0.3);
  });

  it('should show fill opacity option when enabled', () => {
    render(<FillOpacityOption onChange={jest.fn()} value={0.3} isFillOpacityEnabled={true} />);
    expect(screen.getByLabelText('Fill opacity')).toBeInTheDocument();
  });

  it('should hide curve option when disabled', () => {
    render(<FillOpacityOption onChange={jest.fn()} value={1} isFillOpacityEnabled={false} />);
    expect(screen.queryByLabelText('Fill opacity')).not.toBeInTheDocument();
  });
});
