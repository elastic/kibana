/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { NightshiftApp } from './nightshift_app';

describe('NightshiftApp', () => {
  it('renders the title', () => {
    render(<NightshiftApp />);

    expect(screen.getByText('Nightshift')).toBeInTheDocument();
  });
});
