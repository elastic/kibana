/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render } from '@testing-library/react';
import { ExpandableFlyoutProvider } from '@kbn/expandable-flyout';
import React from 'react';
import { AlertPreviewButton } from './alert_preview_button';
import { DocumentDetailsPreviewPanelKey } from '../../document_details/shared/constants/panel_keys';
import { ALERT_PREVIEW_BANNER } from '../../document_details/preview/constants';

const mockOpenPreviewPanel = jest.fn();
jest.mock('@kbn/expandable-flyout', () => {
  return {
    useExpandableFlyoutApi: () => ({
      openPreviewPanel: mockOpenPreviewPanel,
    }),
  };
});

describe('AlertPreviewButton', () => {
  it('renders the icon', () => {
    const { getByTestId } = render(
      <AlertPreviewButton
        id="1"
        indexName="index"
        scopeId="scope"
        data-test-subj="alertPreviewButton"
      />,
      { wrapper: ExpandableFlyoutProvider }
    );
    expect(getByTestId('alertPreviewButton')).toBeInTheDocument();
  });

  it('opens the preview panel when clicked', () => {
    const id = '1';
    const indexName = 'index';
    const scopeId = 'scope';

    const { getByTestId } = render(
      <AlertPreviewButton
        id={id}
        indexName={indexName}
        scopeId={scopeId}
        data-test-subj="alertPreviewButton"
      />,
      { wrapper: ExpandableFlyoutProvider }
    );
    fireEvent.click(getByTestId('alertPreviewButton'));

    expect(mockOpenPreviewPanel).toHaveBeenCalledWith({
      id: DocumentDetailsPreviewPanelKey,
      params: {
        id,
        indexName,
        scopeId,
        isPreviewMode: true,
        banner: ALERT_PREVIEW_BANNER,
      },
    });
  });
});
