/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { css } from '@emotion/react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { panels } from './panels';

export type PreviewPanelPaths = 'rule-preview';
export const PreviewPanelKey: PreviewPanelProps['key'] = 'document-details-preview';

export interface PreviewPanelProps extends FlyoutPanelProps {
  key: 'document-details-preview';
  path?: PreviewPanelPaths[];
  params?: {
    id: string;
    indexName: string;
    scopeId: string;
    banner?: string;
    ruleId?: string;
  };
}

/**
 * Preview panel to be displayed on top of the document details expandable flyout right section
 */
export const PreviewPanel: React.FC<Partial<PreviewPanelProps>> = memo(({ path }) => {
  const previewPanel = useMemo(() => {
    return path ? panels.find((panel) => panel.id === path[0]) : null;
  }, [path]);

  if (!previewPanel) {
    return null;
  }
  return (
    <EuiFlexGroup justifyContent="spaceBetween" direction="column" className="eui-fullHeight">
      <EuiFlexItem
        css={css`
          margin-top: -15px;
        `}
      >
        {previewPanel.content}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{previewPanel.footer}</EuiFlexItem>
    </EuiFlexGroup>
  );
});

PreviewPanel.displayName = 'PreviewPanel';
