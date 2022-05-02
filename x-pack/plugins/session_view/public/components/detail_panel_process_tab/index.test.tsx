/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { sessionViewBasicProcessMock } from '../../../common/mocks/constants/session_view_process.mock';
import { DetailPanelProcessTab } from '.';

describe('DetailPanelProcessTab component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When DetailPanelProcessTab is mounted', () => {
    it('renders DetailPanelProcessTab correctly', async () => {
      renderResult = mockedContext.render(
        <DetailPanelProcessTab selectedProcess={sessionViewBasicProcessMock} />
      );

      // Process detail rendered correctly
      expect(renderResult).toMatchSnapshot();
    });
  });
});
