/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { SampleSummary } from './sample_summary';

describe('SampleSummary (missing service / OTel incomplete data)', () => {
  it('renders nothing when error is undefined', () => {
    const { container } = render(<SampleSummary />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when error.error is undefined', () => {
    const { container } = render(<SampleSummary error={{ error: undefined as any }} />);
    expect(container.firstChild).toBeNull();
  });
});
