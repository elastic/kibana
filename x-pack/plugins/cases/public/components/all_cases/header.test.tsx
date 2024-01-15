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

describe('CasesTableHeader', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('displays the create new case button when the user has create privileges', () => {
    appMockRender = createAppMockRenderer({
      permissions: buildCasesPermissions({ update: false, create: true }),
    });
    const result = appMockRender.render(<CasesTableHeader actionsErrors={[]} />);

    expect(result.getByTestId('createNewCaseBtn')).toBeInTheDocument();
  });

  it('does not display the create new case button when the user does not have create privileges', () => {
    appMockRender = createAppMockRenderer({
      permissions: buildCasesPermissions({ create: false }),
    });
    const result = appMockRender.render(<CasesTableHeader actionsErrors={[]} />);

    expect(result.queryByTestId('createNewCaseBtn')).not.toBeInTheDocument();
  });

  it('displays the configure button when the user has update privileges', () => {
    appMockRender = createAppMockRenderer({
      permissions: buildCasesPermissions({ create: false, update: true }),
    });
    const result = appMockRender.render(<CasesTableHeader actionsErrors={[]} />);

    expect(result.getByTestId('configure-case-button')).toBeInTheDocument();
  });

  it('does not display the configure button when the user does not have settings privileges', () => {
    appMockRender = createAppMockRenderer({
      permissions: buildCasesPermissions({ settings: false }),
    });
    const result = appMockRender.render(<CasesTableHeader actionsErrors={[]} />);

    expect(result.queryByTestId('configure-case-button')).not.toBeInTheDocument();
  });
});
