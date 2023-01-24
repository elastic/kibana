/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { Resources } from '.';

describe('Resources', () => {
  it('renders resources with all elements', () => {
    const { getByText } = render(<Resources />);
    expect(getByText('Documentation')).toBeInTheDocument();
    expect(getByText('Discuss Forum')).toBeInTheDocument();
    expect(getByText('Quick Start Videos')).toBeInTheDocument();
    expect(getByText('Free Observability Course')).toBeInTheDocument();
  });
});
