/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';
import { renderWithContext } from '../../../utils/test_helpers';
import { DependencyLink } from './dependency_link';

describe('DependencyLink', () => {
  it('renders', () => {
    renderWithContext(
      <DependencyLink
        query={{
          dependencyName: 'postgres',
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          comparisonEnabled: false,
        }}
      />
    );

    expect(screen.getByText('postgres')).toBeInTheDocument();
  });
});
