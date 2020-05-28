/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NativeRenderer } from '../../../native_renderer';
import { Visualization, VisualizationLayerWidgetProps } from '../../../types';

export function LayerSettings({
  layerId,
  activeVisualization,
  layerConfigProps,
}: {
  layerId: string;
  activeVisualization: Visualization;
  layerConfigProps: VisualizationLayerWidgetProps;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!activeVisualization.renderLayerContextMenu) {
    return null;
  }

  return (
    <EuiPopover
      id={`lnsLayerPopover_${layerId}`}
      panelPaddingSize="m"
      ownFocus
      button={
        <EuiToolTip
          content={i18n.translate('xpack.lens.editLayerSettings', {
            defaultMessage: 'Edit layer settings',
          })}
        >
          <EuiButtonIcon
            iconType={activeVisualization.getLayerContextMenuIcon?.(layerConfigProps) || 'gear'}
            aria-label={i18n.translate('xpack.lens.editLayerSettings', {
              defaultMessage: 'Edit layer settings',
            })}
            onClick={() => setIsOpen(!isOpen)}
            data-test-subj="lns_layer_settings"
          />
        </EuiToolTip>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
    >
      <NativeRenderer
        render={activeVisualization.renderLayerContextMenu}
        nativeProps={layerConfigProps}
      />
    </EuiPopover>
  );
}
