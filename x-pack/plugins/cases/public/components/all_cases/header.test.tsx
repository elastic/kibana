/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { AppMockRenderer } from '../../common/mock';
import { buildCasesPermissions, createAppMockRenderer } from '../../common/mock';
import { CasesTableHeader } from './header';
import { screen } from '@testing-library/react';

describe('CasesTableHeader', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('displays the create new case button when the user has create privileges', async () => {
    appMockRender = createAppMockRenderer({
      permissions: buildCasesPermissions({ update: false, create: true }),
    });
    appMockRender.render(<CasesTableHeader actionsErrors={[]} />);

    expect(await screen.findByTestId('createNewCaseBtn')).toBeInTheDocument();
  });

  it('does not display the create new case button when the user does not have create privileges', () => {
    appMockRender = createAppMockRenderer({
      permissions: buildCasesPermissions({ create: false }),
    });
    appMockRender.render(<CasesTableHeader actionsErrors={[]} />);

    expect(screen.queryByTestId('createNewCaseBtn')).not.toBeInTheDocument();
  });

  it('displays the configure button when the user has update privileges', async () => {
    appMockRender = createAppMockRenderer({
      permissions: buildCasesPermissions({ create: false, update: true }),
    });
    appMockRender.render(<CasesTableHeader actionsErrors={[]} />);

    expect(await screen.findByTestId('configure-case-button')).toBeInTheDocument();
  });

  it('does not display the configure button when the user does not have settings privileges', () => {
    appMockRender = createAppMockRenderer({
      permissions: buildCasesPermissions({ settings: false }),
    });
    appMockRender.render(<CasesTableHeader actionsErrors={[]} />);

    expect(screen.queryByTestId('configure-case-button')).not.toBeInTheDocument();
  });
});
