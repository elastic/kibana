/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { ObservableTypesForm, type ObservableTypesFormProps } from './form';
import { screen } from '@testing-library/react';

describe('ObservableTypesForm ', () => {
  let appMock: AppMockRenderer;

  const props: ObservableTypesFormProps = {
    onChange: jest.fn(),
    initialValue: null,
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    appMock.render(<ObservableTypesForm {...props} />);
    expect(await screen.findByTestId('observable-types-form')).toBeInTheDocument();
  });
});
