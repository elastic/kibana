/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithTheme } from '../../../../utils/test_helpers';
import { CriticalPathToggle } from './critical_path_toggle';

describe('CriticalPathToggle', () => {
  it('renders with correct label and calls onChange', () => {
    const onChange = jest.fn();
    renderWithTheme(<CriticalPathToggle checked={false} onChange={onChange} />);

    const toggle = screen.getByLabelText('Show critical path');
    expect(toggle).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
