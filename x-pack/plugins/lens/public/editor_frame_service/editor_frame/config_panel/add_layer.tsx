/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlexItem,
  EuiToolTip,
  EuiButton,
  EuiPopover,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { layerTypes } from '../../../../common/expressions';
import type { FramePublicAPI, Visualization } from '../../../types';

interface AddLayerButtonProps {
  visualization: Visualization;
  visualizationState: unknown;
  onAddLayerClick: (layerType: string) => void;
  layersMeta: Pick<FramePublicAPI, 'datasourceLayers' | 'activeData'>;
}

export function getLayerType(visualization: Visualization, state: unknown, layerId: string) {
  return visualization.getLayerType(layerId, state) || layerTypes.DATA;
}

export function AddLayerButton({
  visualization,
  visualizationState,
  onAddLayerClick,
  layersMeta,
}: AddLayerButtonProps) {
  const [showLayersChoice, toggleLayersChoice] = useState(false);

  const hasMultipleLayers = Boolean(visualization.appendLayer && visualizationState);
  if (!hasMultipleLayers) {
    return null;
  }
  const supportedLayers = visualization.getLayerTypes?.(visualizationState, layersMeta);
  if (supportedLayers?.length === 1) {
    return (
      <EuiFlexItem grow={true} className="lnsConfigPanel__addLayerBtnWrapper">
        <EuiToolTip
          className="eui-fullWidth"
          title={i18n.translate('xpack.lens.xyChart.addLayer', {
            defaultMessage: 'Add a layer',
          })}
          content={i18n.translate('xpack.lens.xyChart.addLayerTooltip', {
            defaultMessage:
              'Use multiple layers to combine visualization types or visualize different index patterns.',
          })}
          position="bottom"
        >
          <EuiButton
            className="lnsConfigPanel__addLayerBtn"
            fullWidth
            size="s"
            data-test-subj="lnsLayerAddButton"
            aria-label={i18n.translate('xpack.lens.configPanel.addLayerButton', {
              defaultMessage: 'Add layer',
            })}
            fill
            color="text"
            onClick={() => onAddLayerClick(supportedLayers[0].type)}
            iconType="layers"
          >
            {i18n.translate('xpack.lens.configPanel.addLayerButton', {
              defaultMessage: 'Add layer',
            })}
          </EuiButton>
        </EuiToolTip>
      </EuiFlexItem>
    );
  }
  return (
    <EuiFlexItem grow={true} className="lnsConfigPanel__addLayerBtnWrapper">
      <EuiPopover
        data-test-subj="lnsConfigPanel__addLayerPopover"
        button={
          <EuiButton
            className="lnsConfigPanel__addLayerBtn"
            fullWidth
            size="s"
            data-test-subj="lnsLayerAddButton"
            aria-label={i18n.translate('xpack.lens.configPanel.addLayerButton', {
              defaultMessage: 'Add layer',
            })}
            fill
            color="text"
            onClick={() => toggleLayersChoice(!showLayersChoice)}
            iconType="layers"
          >
            {i18n.translate('xpack.lens.configPanel.addLayerButton', {
              defaultMessage: 'Add layer',
            })}
          </EuiButton>
        }
        isOpen={showLayersChoice}
        closePopover={() => toggleLayersChoice(false)}
        panelPaddingSize="none"
        display="block"
      >
        <EuiContextMenuPanel
          size="s"
          items={supportedLayers.map(({ type, label, icon, disabled, tooltipContent }) => {
            return (
              <EuiContextMenuItem
                key={type}
                data-test-subj={`lnsLayerAddButton-${type}`}
                onClick={() => {
                  onAddLayerClick(type);
                  toggleLayersChoice(false);
                }}
                icon={icon && <EuiIcon size="m" type={icon} />}
                disabled={disabled}
                toolTipContent={tooltipContent}
              >
                {label}
              </EuiContextMenuItem>
            );
          })}
        />
      </EuiPopover>
    </EuiFlexItem>
  );
}
