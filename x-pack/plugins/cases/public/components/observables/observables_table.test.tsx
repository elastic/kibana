/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type AppMockRenderer, createAppMockRenderer } from '../../common/mock';
import { mockCase } from '../../containers/mock';
import { ObservablesTable, type ObservablesTableProps } from './observables_table';

describe('ObservablesTable', () => {
  let appMock: AppMockRenderer;
  const props: ObservablesTableProps = {
    caseData: mockCase,
    isLoading: false,
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const result = appMock.render(<ObservablesTable {...props} />);

    expect(result.getByTestId('cases-observables-table')).toBeInTheDocument();
  });
});
