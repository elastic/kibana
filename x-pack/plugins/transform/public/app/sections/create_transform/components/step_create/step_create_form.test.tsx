/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { StepCreateForm, StepCreateFormProps } from './step_create_form';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../app_dependencies');

describe('Transform: <StepCreateForm />', () => {
  test('Minimal initialization', () => {
    // Arrange
    const props: StepCreateFormProps = {
      createDataView: false,
      transformId: 'the-transform-id',
      transformConfig: {
        dest: {
          index: 'the-destination-index',
        },
        pivot: {
          group_by: {},
          aggregations: {},
        },
        source: {
          index: 'the-source-index',
        },
      },
      overrides: { created: false, started: false, dataViewId: undefined },
      onChange() {},
    };

    const { getByText } = render(<StepCreateForm {...props} />);

    // Act
    // Assert
    expect(getByText('Create and start')).toBeInTheDocument();
  });
});
