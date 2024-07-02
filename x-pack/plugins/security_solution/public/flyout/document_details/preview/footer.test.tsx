/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { DocumentDetailsRightPanelKey } from '../shared/constants/panel_keys';
import { mockFlyoutApi } from '../shared/mocks/mock_flyout_context';
import { mockContextValue } from '../shared/mocks/mock_context';
import { DocumentDetailsContext } from '../shared/context';
import { PreviewPanelFooter } from './footer';
import { PREVIEW_FOOTER_TEST_ID, PREVIEW_FOOTER_LINK_TEST_ID } from './test_ids';

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
  ExpandableFlyoutProvider: ({ children }: React.PropsWithChildren<{}>) => <>{children}</>,
}));

describe('<PreviewPanelFooter />', () => {
  beforeAll(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
  });

  it('should render footer', () => {
    const { getByTestId } = render(
      <DocumentDetailsContext.Provider value={mockContextValue}>
        <PreviewPanelFooter />
      </DocumentDetailsContext.Provider>
    );
    expect(getByTestId(PREVIEW_FOOTER_TEST_ID)).toBeInTheDocument();
  });

  it('should open document details flyout when clicked', () => {
    const { getByTestId } = render(
      <DocumentDetailsContext.Provider value={mockContextValue}>
        <PreviewPanelFooter />
      </DocumentDetailsContext.Provider>
    );

    getByTestId(PREVIEW_FOOTER_LINK_TEST_ID).click();
    expect(mockFlyoutApi.openFlyout).toHaveBeenCalledWith({
      right: {
        id: DocumentDetailsRightPanelKey,
        params: {
          id: mockContextValue.eventId,
          indexName: mockContextValue.indexName,
          scopeId: mockContextValue.scopeId,
        },
      },
    });
  });
});
