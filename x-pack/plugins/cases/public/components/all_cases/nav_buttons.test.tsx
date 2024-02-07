/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { AppMockRenderer } from '../../common/mock';
import {
  createAppMockRenderer,
  noCasesSettingsPermission,
  noCreateCasesPermissions,
  buildCasesPermissions,
} from '../../common/mock';
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

  it('does not render the case create button with no create permissions', () => {
    appMockRenderer = createAppMockRenderer({ permissions: noCreateCasesPermissions() });
    appMockRenderer.render(<NavButtons actionsErrors={[]} />);

    expect(screen.queryByTestId('createNewCaseBtn')).not.toBeInTheDocument();
  });

  it('does not render the case configure button with no settings permissions', () => {
    appMockRenderer = createAppMockRenderer({ permissions: noCasesSettingsPermission() });
    appMockRenderer.render(<NavButtons actionsErrors={[]} />);

    expect(screen.queryByTestId('configure-case-button')).not.toBeInTheDocument();
  });

  it('does not render any button with no create and no settings permissions', () => {
    appMockRenderer = createAppMockRenderer({
      permissions: buildCasesPermissions({ create: false, settings: false }),
    });
    appMockRenderer.render(<NavButtons actionsErrors={[]} />);

    expect(screen.queryByTestId('createNewCaseBtn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('configure-case-button')).not.toBeInTheDocument();
  });
});
