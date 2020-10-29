/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { ServiceOverview } from './';

describe('ServiceOverview', () => {
  it('renders', () => {
    expect(() =>
      render(<ServiceOverview serviceName="test service name" />)
    ).not.toThrowError();
  });
});
