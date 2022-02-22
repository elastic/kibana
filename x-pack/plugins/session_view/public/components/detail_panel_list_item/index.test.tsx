/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { DetailPanelListItem } from './index';

const TEST_STRING = 'item title';
const TEST_CHILD = <span>{TEST_STRING}</span>;
const TEST_COPY_STRING = 'test copy button';
const TEST_COPY = <button data-test-subj="test-copy-button">{TEST_COPY_STRING}</button>;

describe('DetailPanelListItem component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When DetailPanelListItem is mounted', () => {
    it('renders DetailPanelListItem correctly', async () => {
      renderResult = mockedContext.render(<DetailPanelListItem>{TEST_CHILD}</DetailPanelListItem>);

      expect(renderResult.queryByTestId('sessionViewer:detail-panel-list-item')).toBeVisible();
      expect(renderResult.queryByText(TEST_STRING)).toBeVisible();
    });

    it('renders copy element correctly', async () => {
      renderResult = mockedContext.render(
        <DetailPanelListItem copy={TEST_COPY}>{TEST_CHILD}</DetailPanelListItem>
      );

      expect(renderResult.queryByTestId('test-copy-button')).toBeNull();
      fireEvent.mouseEnter(renderResult.getByTestId('sessionViewer:detail-panel-list-item'));
      await waitFor(() => screen.queryByTestId('test-copy-button'));
      expect(renderResult.queryByTestId('test-copy-button')).toBeVisible();
    });
  });
});
