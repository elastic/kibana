/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiToolTip,
  EuiButton,
  EuiPopover,
  EuiIcon,
  EuiContextMenu,
  EuiBadge,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { LayerType, layerTypes } from '../../../../common';
import type { FramePublicAPI, Visualization } from '../../../types';

interface AddLayerButtonProps {
  visualization: Visualization;
  visualizationState: unknown;
  onAddLayerClick: (layerType: LayerType) => void;
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

  const supportedLayers = useMemo(() => {
    if (!visualization.appendLayer || !visualizationState) {
      return null;
    }
    return visualization.getSupportedLayers?.(visualizationState, layersMeta);
  }, [visualization, visualizationState, layersMeta]);

  if (supportedLayers == null) {
    return null;
  }
  if (supportedLayers.length === 1) {
    return (
      <EuiToolTip
        display="block"
        title={i18n.translate('xpack.lens.xyChart.addLayer', {
          defaultMessage: 'Add a layer',
        })}
        content={i18n.translate('xpack.lens.xyChart.addLayerTooltip', {
          defaultMessage:
            'Use multiple layers to combine visualization types or visualize different data views.',
        })}
        position="bottom"
      >
        <EuiButton
          className="lnsConfigPanel__addLayerBtn"
          fullWidth
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
    );
  }
  return (
    <EuiPopover
      display="block"
      data-test-subj="lnsConfigPanel__addLayerPopover"
      button={
        <EuiButton
          className="lnsConfigPanel__addLayerBtn"
          fullWidth
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
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={[
          {
            id: 0,
            title: i18n.translate('xpack.lens.configPanel.selectLayerType', {
              defaultMessage: 'Select layer type',
            }),
            items: supportedLayers.map(({ type, label, icon, disabled, toolTipContent }) => {
              return {
                toolTipContent,
                disabled,
                name:
                  type === layerTypes.ANNOTATIONS ? (
                    <EuiFlexGroup gutterSize="m">
                      <EuiFlexItem>
                        <span className="lnsLayerAddButton__label">{label}</span>
                      </EuiFlexItem>

                      <EuiFlexItem grow={false}>
                        <EuiBadge
                          className="lnsLayerAddButton__techBadge"
                          color="hollow"
                          isDisabled={disabled}
                        >
                          {i18n.translate('xpack.lens.configPanel.experimentalLabel', {
                            defaultMessage: 'Technical preview',
                          })}
                        </EuiBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ) : (
                    <span className="lnsLayerAddButtonLabel">{label}</span>
                  ),
                className: 'lnsLayerAddButton',
                icon: icon && <EuiIcon size="m" type={icon} />,
                ['data-test-subj']: `lnsLayerAddButton-${type}`,
                onClick: () => {
                  onAddLayerClick(type);
                  toggleLayersChoice(false);
                },
              };
            }),
          },
        ]}
      />
    </EuiPopover>
  );
}
