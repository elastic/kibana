/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { FlyoutBody } from '@kbn/security-solution-common';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { DocumentDetailsAnalyzerPanelKey } from '../shared/constants/panel_keys';
import { DetailsPanel } from '../../../resolver/view/details_panel';
import { DocumentDetailsPreviewPanelKey } from '../shared/constants/panel_keys';
import { ALERT_PREVIEW_BANNER } from '../preview/constants';

interface AnalyzerPanelProps extends Record<string, unknown> {
  /**
   * id to identify the scope of analyzer in redux
   */
  resolverComponentInstanceID: string;
}

export interface AnalyzerPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: typeof DocumentDetailsAnalyzerPanelKey;
  params: AnalyzerPanelProps;
}

/**
 * Displays node details panel for analyzer
 */
export const AnalyzerPanel: React.FC<AnalyzerPanelProps> = ({ resolverComponentInstanceID }) => {
  const { openPreviewPanel } = useExpandableFlyoutApi();

  const openPreview = useCallback(
    ({ documentId, indexName, scopeId }) =>
      () => {
        openPreviewPanel({
          id: DocumentDetailsPreviewPanelKey,
          params: {
            id: documentId,
            indexName,
            scopeId,
            isPreviewMode: true,
            banner: ALERT_PREVIEW_BANNER,
          },
        });
      },
    [openPreviewPanel]
  );

  return (
    <FlyoutBody>
      <div style={{ marginTop: '-15px' }}>
        <DetailsPanel
          resolverComponentInstanceID={resolverComponentInstanceID}
          nodeEventOnClick={openPreview}
        />
      </div>
    </FlyoutBody>
  );
};

AnalyzerPanel.displayName = 'AnalyzerPanel';
