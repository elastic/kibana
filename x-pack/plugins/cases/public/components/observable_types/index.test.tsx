/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import type { ObservableTypesProps } from '.';
import { ObservableTypes } from '.';

describe('ObservableTypes', () => {
  let appMock: AppMockRenderer;

  const props: ObservableTypesProps = {
    disabled: false,
    isLoading: false,
    observableTypes: [],
    handleAddObservableType: jest.fn(),
    handleEditObservableType: jest.fn(),
    handleDeleteObservableType: jest.fn(),
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    appMock.render(<ObservableTypes {...props} />);
  });
});
