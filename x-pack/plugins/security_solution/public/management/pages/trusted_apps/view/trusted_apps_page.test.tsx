/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import { TrustedAppsPage } from './trusted_apps_page';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';

describe('TrustedAppsPage', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    render = () => mockedContext.render(<TrustedAppsPage />);
    reactTestingLibrary.act(() => {
      mockedContext.history.push('/trusted_apps');
    });
  });

  test('rendering', () => {
    expect(render()).toMatchSnapshot();
  });
});
