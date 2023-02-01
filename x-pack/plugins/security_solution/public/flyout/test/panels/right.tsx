/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RightPanel } from '../panel_model';
import { useExpandableFlyoutContext } from '../../context';

export const RightDetailsPanelKey: RightPanel['id'] = 'right';

export const RightDetailsPanel = React.memo(() => {
  const {
    closePanels,
    closeRightPanel,
    openPanels,
    openLeftPanel,
    openPreviewPanel,
    openRightPanel,
  } = useExpandableFlyoutContext();

  return (
    <EuiFlexGroup direction="column" css={{ backgroundColor: '#07C', height: '100%' }}>
      <EuiFlexItem grow={false}>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.expandableFlyout.rightTitle"
              defaultMessage="Test right panel"
            />
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={() =>
            openRightPanel({
              id: 'right2',
              params: {
                id: '',
                indexName: '',
              },
            })
          }
        >
          <FormattedMessage
            id="xpack.securitySolution.expandableFlyout.right.openRight2"
            defaultMessage="Open right2 panel"
          />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={() =>
            openLeftPanel({
              id: 'left',
              params: {
                id: '',
                indexName: '',
              },
            })
          }
        >
          <FormattedMessage
            id="xpack.securitySolution.expandableFlyout.right.openLeft"
            defaultMessage="Open left panel"
          />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={() =>
            openLeftPanel({
              id: 'left2',
              params: {
                id: '',
                indexName: '',
              },
            })
          }
        >
          <FormattedMessage
            id="xpack.securitySolution.expandableFlyout.right.openLeft2"
            defaultMessage="Open left2 panel"
          />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={() =>
            openPreviewPanel({
              id: 'preview',
              params: {
                id: '',
                indexName: '',
              },
            })
          }
        >
          <FormattedMessage
            id="xpack.securitySolution.expandableFlyout.right.openPreview"
            defaultMessage="Open preview panel"
          />
        </EuiButton>
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
            id="xpack.securitySolution.expandableFlyout.right.openPreview2"
            defaultMessage="Open preview2 panel"
          />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={() =>
            openPanels({
              left: {
                id: 'left',
                params: {
                  id: '',
                  indexName: '',
                },
              },
              preview: {
                id: 'preview',
                params: {
                  id: '',
                  indexName: '',
                },
              },
            })
          }
        >
          <FormattedMessage
            id="xpack.securitySolution.expandableFlyout.right.openLeft&Preview"
            defaultMessage="Open left and preview panels"
          />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton onClick={() => closeRightPanel()}>
          <FormattedMessage
            id="xpack.securitySolution.expandableFlyout.right.closeRight"
            defaultMessage="Close right panel"
          />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton onClick={() => closePanels()}>
          <FormattedMessage
            id="xpack.securitySolution.expandableFlyout.right.closeAll"
            defaultMessage="Close all panels"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

RightDetailsPanel.displayName = 'RightDetailsPanel';
