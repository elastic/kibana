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
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import { Visualization } from '../..';
import { AddLayerFunction, FramePublicAPI } from '../../types';
import { LoadAnnotationLibraryFlyout } from './load_annotation_library_flyout';
import type { ExtraAppendLayerArg } from './visualization';

interface AddLayerButtonProps {
  visualization: Visualization;
  visualizationState: unknown;
  addLayer: AddLayerFunction;
  onAddLayerFromAnnotationGroup: (arg: ExtraAppendLayerArg) => void;
  layersMeta: Pick<FramePublicAPI, 'datasourceLayers' | 'activeData'>;
  eventAnnotationService: EventAnnotationServiceType;
}

// this is a very generic implementation and some of the edgecases don't apply to the xy chart... We might want to clean up
export function AddLayerButton({
  visualization,
  visualizationState,
  addLayer,
  onAddLayerFromAnnotationGroup,
  layersMeta,
  eventAnnotationService,
}: AddLayerButtonProps) {
  const [showLayersChoice, toggleLayersChoice] = useState(false);

  const [isLoadLibraryVisible, setLoadLibraryFlyoutVisible] = useState(false);

  const supportedLayers = useMemo(() => {
    if (!visualization.appendLayer || !visualizationState) {
      return null;
    }
    return visualization
      .getSupportedLayers?.(visualizationState, layersMeta)
      ?.filter(({ canAddViaMenu: hideFromMenu }) => !hideFromMenu);
  }, [visualization, visualizationState, layersMeta]);

  if (!supportedLayers?.length) {
    return null;
  }
  const annotationPanel = ({
    type,
    label,
    icon,
    disabled,
    toolTipContent,
  }: typeof supportedLayers[0]) => {
    return {
      panel: 1,
      toolTipContent,
      disabled,
      name: (
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <span className="lnsLayerAddButton__label">{label}</span>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiBadge className="lnsLayerAddButton__techBadge" color="hollow" isDisabled={disabled}>
              {i18n.translate('xpack.lens.configPanel.experimentalLabel', {
                defaultMessage: 'Technical preview',
              })}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      className: 'lnsLayerAddButton',
      icon: icon && <EuiIcon size="m" type={icon} />,
      ['data-test-subj']: `lnsLayerAddButton-${type}`,
    };
  };
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
          fullWidth
          data-test-subj="lnsLayerAddButton"
          aria-label={i18n.translate('xpack.lens.configPanel.addLayerButton', {
            defaultMessage: 'Add layer',
          })}
          fill
          color="text"
          onClick={() => addLayer(supportedLayers[0].type)}
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
    <>
      <EuiPopover
        display="block"
        data-test-subj="lnsConfigPanel__addLayerPopover"
        button={
          <EuiButton
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
              width: 300,
              items: supportedLayers.map((props) => {
                const { type, label, icon, disabled, toolTipContent } = props;
                if (type === LayerTypes.ANNOTATIONS) {
                  return annotationPanel(props);
                }
                return {
                  toolTipContent,
                  disabled,
                  name: <span className="lnsLayerAddButtonLabel">{label}</span>,
                  className: 'lnsLayerAddButton',
                  icon: icon && <EuiIcon size="m" type={icon} />,
                  ['data-test-subj']: `lnsLayerAddButton-${type}`,
                  onClick: () => {
                    addLayer(type);
                    toggleLayersChoice(false);
                  },
                };
              }),
            },
            {
              id: 1,
              initialFocusedItemIndex: 0,
              title: i18n.translate('xpack.lens.configPanel.selectAnnotationMethod', {
                defaultMessage: 'Select annotation method',
              }),
              items: [
                {
                  name: i18n.translate('xpack.lens.configPanel.newAnnotation', {
                    defaultMessage: 'New annotation',
                  }),
                  icon: 'plusInCircleFilled',
                  onClick: () => {
                    addLayer(LayerTypes.ANNOTATIONS);
                    toggleLayersChoice(false);
                  },
                  'data-test-subj': 'lnsAnnotationLayer_new',
                },
                {
                  name: i18n.translate('xpack.lens.configPanel.loadFromLibrary', {
                    defaultMessage: 'Load from library',
                  }),
                  icon: 'folderOpen',
                  onClick: () => {
                    setLoadLibraryFlyoutVisible(true);
                    toggleLayersChoice(false);
                  },
                  'data-test-subj': 'lnsAnnotationLayer_addFromLibrary',
                },
              ],
            },
          ]}
        />
      </EuiPopover>
      {isLoadLibraryVisible && (
        <LoadAnnotationLibraryFlyout
          isLoadLibraryVisible={isLoadLibraryVisible}
          setLoadLibraryFlyoutVisible={setLoadLibraryFlyoutVisible}
          eventAnnotationService={eventAnnotationService}
          addLayer={onAddLayerFromAnnotationGroup}
        />
      )}
    </>
  );
}
