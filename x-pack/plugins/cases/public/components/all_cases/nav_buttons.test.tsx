/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer, noConfigureCasePermission } from '../../common/mock';
import { NavButtons } from './nav_buttons';

describe('NavButtons', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
  });

  it('shows the configure case button', () => {
    appMockRenderer.render(<NavButtons actionsErrors={[]} />);

    expect(screen.getByTestId('configure-case-button')).toBeInTheDocument();
  });

  it('does not render the case configure button with no configure permissions', () => {
    appMockRenderer = createAppMockRenderer({ permissions: noConfigureCasePermission() });
    appMockRenderer.render(<NavButtons actionsErrors={[]} />);

    expect(screen.queryByTestId('configure-case-button')).not.toBeInTheDocument();
  });
});
