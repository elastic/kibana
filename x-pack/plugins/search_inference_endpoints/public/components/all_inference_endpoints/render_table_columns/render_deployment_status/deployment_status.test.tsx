/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { DeploymentStatus } from './deployment_status';
import { DeploymentStatusEnum } from '../../types';

describe('DeploymentStatus component', () => {
  it.each([[DeploymentStatusEnum.deployed, DeploymentStatusEnum.notDeployed]])(
    'renders with %s status, expects %s color, and correct data-test-subj attribute',
    (status) => {
      render(<DeploymentStatus status={status} />);
      const healthComponent = screen.getByTestId(`table-column-deployment-${status}`);
      expect(healthComponent).toBeInTheDocument();
    }
  );

  it('does not render when status is notApplicable', () => {
    const { container } = render(<DeploymentStatus status={DeploymentStatusEnum.notApplicable} />);
    expect(container).toBeEmptyDOMElement();
  });
});
