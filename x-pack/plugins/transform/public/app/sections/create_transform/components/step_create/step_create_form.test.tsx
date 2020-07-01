/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { StepCreateForm } from './step_create_form';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../../app/app_dependencies');

describe('Transform: <StepCreateForm />', () => {
  test('Minimal initialization', () => {
    // Arrange
    const props = {
      createIndexPattern: false,
      transformId: 'the-transform-id',
      transformConfig: {},
      overrides: { created: false, started: false, indexPatternId: undefined },
      onChange() {},
    };

    const { getByText } = render(<StepCreateForm {...props} />);

    // Act
    // Assert
    expect(getByText('Create and start')).toBeInTheDocument();
  });
});
