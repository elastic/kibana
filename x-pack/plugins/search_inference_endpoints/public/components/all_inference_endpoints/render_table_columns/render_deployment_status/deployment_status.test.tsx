/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { DeploymentStatus } from './deployment_status';
import { DeploymentState } from '@kbn/ml-trained-models-utils';

describe('DeploymentStatus component', () => {
  it('starting renders with warning status', () => {
    render(<DeploymentStatus status={'starting' as DeploymentState} />);
    const healthComponent = screen.getByTestId(`table-column-deployment-starting`);
    expect(healthComponent).toBeInTheDocument();
    expect(healthComponent).toHaveAttribute('color', 'warning');
  });
  it('stopping renders with danger status', () => {
    render(<DeploymentStatus status={'stopping' as DeploymentState} />);
    const healthComponent = screen.getByTestId(`table-column-deployment-stopping`);
    expect(healthComponent).toBeInTheDocument();
    expect(healthComponent).toHaveAttribute('color', 'danger');
  });

  it('started renders with success status', () => {
    render(<DeploymentStatus status={'started' as DeploymentState} />);
    const healthComponent = screen.getByTestId(`table-column-deployment-started`);
    expect(healthComponent).toBeInTheDocument();
    expect(healthComponent).toHaveAttribute('color', 'success');
  });
});
