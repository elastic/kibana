/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { PlatformIcon, type PlatformIconProps } from './platform_icon';

describe('PlatformIcon', () => {
  let render: (props: PlatformIconProps) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    render = (props) =>
      (renderResult = mockedContext.render(
        <PlatformIcon {...{ 'data-test-subj': 'test', ...props }} />
      ));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each(['linux', 'macos', 'windows', 'unknown'] as Array<PlatformIconProps['platform']>)(
    'should render icon for %s',
    (platform) => {
      render({ platform });
      const icon = renderResult.getByTestId('test');
      expect(icon).toBeTruthy();
    }
  );
});
