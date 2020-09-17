/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from '@testing-library/react';
import React from 'react';

import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { mockHtmlGenerator } from '../test_utils';

import { TrustedAppsPage } from './trusted_apps_page';

mockHtmlGenerator();

describe('TrustedAppsPage', () => {
  test('rendering', () => {
    const mockedContext = createAppRootMockRenderer();
    const element = mockedContext.render(<TrustedAppsPage />);

    act(() => mockedContext.history.push('/trusted_apps'));

    expect(element.container).toMatchSnapshot();
  });
});
