/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
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
  const description = activeVisualization.getDescription(layerConfigProps.state);

  if (!activeVisualization.renderLayerHeader) {
    if (!description) {
      return null;
    }
    return (
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        className={'lnsLayerPanel__settingsStaticHeader'}
      >
        {description.icon && (
          <EuiFlexItem grow={false}>
            <EuiIcon type={description.icon} />{' '}
          </EuiFlexItem>
        )}
        <EuiFlexItem grow className={'lnsLayerPanel__settingsTitle'}>
          {description.label}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // const a11yText = (chartType?: string) => {
  //   if (chartType) {
  //     return i18n.translate('xpack.lens.editLayerSettingsChartType', {
  //       defaultMessage: 'Edit layer settings, {chartType}',
  //       values: {
  //         chartType,
  //       },
  //     });
  //   }
  //   return i18n.translate('xpack.lens.editLayerSettings', {
  //     defaultMessage: 'Edit layer settings',
  //   });
  // };

  return (
    <NativeRenderer render={activeVisualization.renderLayerHeader} nativeProps={layerConfigProps} />
  );
}

//   const contextMenuIcon = activeVisualization.getLayerContextMenuIcon?.(layerConfigProps);
//   return (
//     <EuiPopover
//       id={`lnsLayerPopover_${layerId}`}
//       panelPaddingSize="m"
//       ownFocus
//       button={
//         <EuiToolTip
//           content={i18n.translate('xpack.lens.editLayerSettings', {
//             defaultMessage: 'Edit layer settings',
//           })}
//         >
//           <ToolbarButton
//             size="s"
//             iconType={contextMenuIcon?.icon || 'gear'}
//             aria-label={a11yText(contextMenuIcon?.label || '')}
//             title={a11yText(contextMenuIcon?.label || '')}
//             onClick={() => setIsOpen(!isOpen)}
//             data-test-subj="lns_layer_settings"
//           />
//         </EuiToolTip>
//       }
//       isOpen={isOpen}
//       closePopover={() => setIsOpen(false)}
//       anchorPosition="downLeft"
//     >
//       <NativeRenderer
//         render={activeVisualization.renderLayerContextMenu}
//         nativeProps={layerConfigProps}
//       />
//     </EuiPopover>
//   );
// }
