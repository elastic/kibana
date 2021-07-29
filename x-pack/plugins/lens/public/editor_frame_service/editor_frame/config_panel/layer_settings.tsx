/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiToolTip, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NativeRenderer } from '../../../native_renderer';
import { Visualization, VisualizationLayerWidgetProps } from '../../../types';
import { ToolbarButton } from '../../../../../../../src/plugins/kibana_react/public';

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
    return <p>TODO: {activeVisualization.getDescription(layerConfigProps.state).label}</p>;
  }

  // @TODO: Handle threshold layer title
  // if (activeVisualization.isSpecialLayer(layerConfigProps.state)) {
  //   const thresholdInfo = activeVisualization
  //     .getLayerTypes(layerConfigProps.state)
  //     ?.find(({ type }) => type === layerType);
  //   if (thresholdInfo) {
  //     return (
  //       <p>
  //         {thresholdInfo.icon && <EuiIcon type={thresholdInfo.icon} />} {thresholdInfo.label}
  //       </p>
  //     );
  //   }
  // }

  const a11yText = (chartType?: string) => {
    if (chartType) {
      return i18n.translate('xpack.lens.editLayerSettingsChartType', {
        defaultMessage: 'Edit layer settings, {chartType}',
        values: {
          chartType,
        },
      });
    }
    return i18n.translate('xpack.lens.editLayerSettings', {
      defaultMessage: 'Edit layer settings',
    });
  };

  const contextMenuIcon = activeVisualization.getLayerContextMenuIcon?.(layerConfigProps);
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
          <ToolbarButton
            size="s"
            iconType={contextMenuIcon?.icon || 'gear'}
            aria-label={a11yText(contextMenuIcon?.label || '')}
            title={a11yText(contextMenuIcon?.label || '')}
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
