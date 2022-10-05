/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { AppMockRenderer, createAppMockRenderer } from '../../common/mock';
import { UtilityBarAction } from '.';

describe('UtilityBarAction', () => {
  let appMockRenderer: AppMockRenderer;
  const dataTestSubj = 'test-bar-action';

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  test('it renders', () => {
    const res = appMockRenderer.render(
      <UtilityBarAction iconType="alert" dataTestSubj={dataTestSubj}>
        {'Test action'}
      </UtilityBarAction>
    );

    expect(res.getByTestId(dataTestSubj)).toBeInTheDocument();
    expect(res.getByText('Test action')).toBeInTheDocument();
  });

  test('it renders a popover', () => {
    const res = appMockRenderer.render(
      <UtilityBarAction iconType="alert" dataTestSubj={dataTestSubj}>
        {'Test action'}
      </UtilityBarAction>
    );

    expect(res.getByTestId(`${dataTestSubj}-link-icon`)).toBeInTheDocument();
  });
});
