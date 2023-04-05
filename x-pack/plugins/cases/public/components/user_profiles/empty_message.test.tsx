/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EmptyMessage } from './empty_message';
import { render } from '@testing-library/react';

describe('EmptyMessage', () => {
  it('renders a null component', () => {
    const { container } = render(<EmptyMessage />);
    expect(container.firstChild).toBeNull();
  });
});
