/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { AppMockRenderer, buildCasesPermissions, createAppMockRenderer } from '../../common/mock';
import { CasesTableHeader } from './header';

describe('CasesTableHeader', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('displays the create new case button when the user has create and update privileges', () => {
    const result = appMockRender.render(<CasesTableHeader actionsErrors={[]} />);

    expect(result.getByTestId('createNewCaseBtn')).toBeInTheDocument();
  });

  it('does not display the create new case button when the user does not have all privileges', () => {
    appMockRender = createAppMockRenderer({
      permissions: buildCasesPermissions({ create: false, update: false }),
    });
    const result = appMockRender.render(<CasesTableHeader actionsErrors={[]} />);

    expect(result.queryByTestId('createNewCaseBtn')).not.toBeInTheDocument();
  });
});
