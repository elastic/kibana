/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, memo } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { StyledEuiButtonIcon } from './styles';
import { useColors } from '../use_colors';
import { DocumentDetailsPreviewPanelKey } from '../../../flyout/document_details/shared/constants/panel_keys';
import { type PreviewPanelProps, AnalyzerPanel } from '../../../flyout/document_details/preview';

export const PanelButton = memo(
  ({ id, eventId, indexName }: { id: string; eventId: string; indexName: string }) => {
    const { openPreviewPanel } = useExpandableFlyoutApi();

    // If in flyout, scope Id is "flyout-scopeId"
    const scopeId = id.startsWith('flyout') ? id.substring(7) : id;

    const onClick = useCallback(() => {
      const PreviewPanelAnalyzerPanel: PreviewPanelProps['path'] = { tab: AnalyzerPanel };
      openPreviewPanel({
        id: DocumentDetailsPreviewPanelKey,
        path: PreviewPanelAnalyzerPanel,
        params: {
          id: eventId,
          indexName,
          scopeId,
        },
      });
    }, [openPreviewPanel, eventId, indexName, scopeId]);
    const colorMap = useColors();

    return (
      <StyledEuiButtonIcon
        data-test-subj="resolver:graph-controls:show-panel-button"
        size="m"
        title={'panel'}
        aria-label={'open panel'}
        onClick={onClick}
        iconType={'eye'}
        $backgroundColor={colorMap.graphControlsBackground}
        $iconColor={colorMap.graphControls}
        $borderColor={colorMap.graphControlsBorderColor}
      />
    );
  }
);

PanelButton.displayName = 'PanelButton';
