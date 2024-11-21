/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createAppMockRenderer, noCasesPermissions } from '../../common/mock';
import type { AddObservableProps } from './add_observable';
import { AddObservable } from './add_observable';
import { mockCase } from '../../containers/mock';

describe('AddObservable', () => {
  const props: AddObservableProps = {
    caseData: mockCase,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the button when permissions are sufficient', async () => {
    const appMock = createAppMockRenderer();
    const result = appMock.render(<AddObservable {...props} />);

    expect(result.getByTestId('cases-observables-add')).toBeInTheDocument();
  });

  it('does not render the button with insufficient permissions', async () => {
    const appMock = createAppMockRenderer({ permissions: noCasesPermissions() });
    const result = appMock.render(<AddObservable {...props} />);

    expect(result.queryByTestId('cases-observables-add')).not.toBeInTheDocument();
  });
});
