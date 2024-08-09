/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type AppMockRenderer, createAppMockRenderer } from '../../common/mock';
import type { AddObservableProps } from './add_observable';
import { AddObservable } from './add_observable';
import { mockCase } from '../../containers/mock';

describe('AddObservable', () => {
  let appMock: AppMockRenderer;
  const props: AddObservableProps = {
    caseData: mockCase,
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const result = appMock.render(<AddObservable {...props} />);

    expect(result.getByTestId('cases-observables-add')).toBeInTheDocument();
  });
});
