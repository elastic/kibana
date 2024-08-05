/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import React from 'react';
import { DocumentDetailsContext } from '../../shared/context';
import { SessionPreviewContainer } from './session_preview_container';
import { useSessionPreview } from '../hooks/use_session_preview';
import { useLicense } from '../../../../common/hooks/use_license';
import { SESSION_PREVIEW_TEST_ID } from './test_ids';
import {
  EXPANDABLE_PANEL_CONTENT_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '@kbn/security-solution-common';
import { mockGetFieldsData } from '../../shared/mocks/mock_get_fields_data';

jest.mock('../hooks/use_session_preview');
jest.mock('../../../../common/hooks/use_license');

const NO_DATA_MESSAGE =
  'You can only view Linux session details if you’ve enabled the Include session data setting in your Elastic Defend integration policy. Refer to Enable Session View dataExternal link(opens in a new tab or window) for more information.';

const UPSELL_TEXT = 'This feature requires an Enterprise subscription';

const panelContextValue = {
  getFieldsData: mockGetFieldsData,
} as unknown as DocumentDetailsContext;

const sessionViewConfig = {
  index: {},
  sessionEntityId: 'sessionEntityId',
  sessionStartTime: 'sessionStartTime',
};

const renderSessionPreview = (context = panelContextValue) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={context}>
        <SessionPreviewContainer />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('SessionPreviewContainer', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render component and link in header', () => {
    (useSessionPreview as jest.Mock).mockReturnValue(sessionViewConfig);
    (useLicense as jest.Mock).mockReturnValue({ isEnterprise: () => true });

    const { getByTestId } = renderSessionPreview();

    expect(getByTestId(SESSION_PREVIEW_TEST_ID)).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).toBeInTheDocument();

    expect(
      screen.queryByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).not.toHaveTextContent(NO_DATA_MESSAGE);
    expect(
      screen.queryByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).not.toHaveTextContent(UPSELL_TEXT);
  });

  it('should render error message and text in header if no sessionConfig', () => {
    (useSessionPreview as jest.Mock).mockReturnValue(null);
    (useLicense as jest.Mock).mockReturnValue({ isEnterprise: () => true });

    const { getByTestId, queryByTestId } = renderSessionPreview();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).toHaveTextContent(NO_DATA_MESSAGE);

    expect(
      screen.queryByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).not.toHaveTextContent(UPSELL_TEXT);
    expect(queryByTestId(SESSION_PREVIEW_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render upsell message in header if no correct license', () => {
    (useSessionPreview as jest.Mock).mockReturnValue(sessionViewConfig);
    (useLicense as jest.Mock).mockReturnValue({ isEnterprise: () => false });

    const { getByTestId, queryByTestId } = renderSessionPreview();

    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).toHaveTextContent(UPSELL_TEXT);

    expect(
      screen.queryByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).not.toHaveTextContent(NO_DATA_MESSAGE);
    expect(queryByTestId(SESSION_PREVIEW_TEST_ID)).not.toBeInTheDocument();
  });

  it('should not render link to session viewer if flyout is open in preview', () => {
    (useSessionPreview as jest.Mock).mockReturnValue(sessionViewConfig);
    (useLicense as jest.Mock).mockReturnValue({ isEnterprise: () => true });

    const { getByTestId, queryByTestId } = renderSessionPreview({
      ...panelContextValue,
      isPreview: true,
    });

    expect(getByTestId(SESSION_PREVIEW_TEST_ID)).toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
  });
});
