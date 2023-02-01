/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutContext } from '../../context';
import type { PreviewPanel } from '../panel_model';

export const PreviewDetailsPanelKey: PreviewPanel['id'] = 'preview';

export const PreviewDetailsPanel = React.memo(() => {
  const { closePanels, closePreviewPanel, openPreviewPanel } = useExpandableFlyoutContext();

  return (
    <EuiFlexGroup direction="column" css={{ backgroundColor: '#00BFB3', height: '100%' }}>
      <EuiFlexItem grow={false}>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.expandableFlyout.test.previewTitle"
              defaultMessage="Test preview panel"
            />
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={() =>
            openPreviewPanel({
              id: 'preview2',
              params: {
                id: '',
                indexName: '',
              },
            })
          }
        >
          <FormattedMessage
            id="xpack.securitySolution.expandableFlyout.preview.openPreview2"
            defaultMessage="Open preview2 panel"
          />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton onClick={() => closePreviewPanel()}>
          <FormattedMessage
            id="xpack.securitySolution.expandableFlyout.preview.closePreview"
            defaultMessage="Close preview panel"
          />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton onClick={() => closePanels()}>
          <FormattedMessage
            id="xpack.securitySolution.expandableFlyout.preview.closeAll"
            defaultMessage="Close all panels"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

PreviewDetailsPanel.displayName = 'PreviewDetailsPanel';
