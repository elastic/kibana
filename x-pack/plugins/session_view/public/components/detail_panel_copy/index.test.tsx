/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { DetailPanelCopy } from '.';

const TEST_TEXT_COPY = 'copy component test';
const TEST_CHILD = <span>{TEST_TEXT_COPY}</span>;

describe('DetailPanelCopy component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When DetailPanelCopy is mounted', () => {
    it('renders DetailPanelCopy correctly', async () => {
      renderResult = mockedContext.render(
        <DetailPanelCopy textToCopy={TEST_TEXT_COPY}>{TEST_CHILD}</DetailPanelCopy>
      );

      expect(renderResult.queryByText(TEST_TEXT_COPY)).toBeVisible();
    });
  });
});
