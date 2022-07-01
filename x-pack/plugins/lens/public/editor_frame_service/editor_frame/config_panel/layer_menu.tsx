/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Visualization } from '../../../types';

const getDeleteText = (canBeRemoved: boolean, isOnlyLayer: boolean, layerIndex: number) => {
  if (!canBeRemoved) {
    return {
      buttonText: i18n.translate('xpack.lens.resetVisualizationButtonText', {
        defaultMessage: 'Reset',
      }),
      ariaLabel: i18n.translate('xpack.lens.resetVisualizationAriaLabel', {
        defaultMessage: 'Reset visualization',
      }),
    };
  } else if (isOnlyLayer) {
    return {
      buttonText: i18n.translate('xpack.lens.resetLayerButtonText', {
        defaultMessage: 'Reset',
      }),
      ariaLabel: i18n.translate('xpack.lens.resetLayerAriaLabel', {
        defaultMessage: 'Reset layer {index}',
        values: { index: layerIndex + 1 },
      }),
    };
  } else {
    return {
      buttonText: i18n.translate('xpack.lens.deleteLayerButtonText', {
        defaultMessage: 'Delete',
      }),
      ariaLabel: i18n.translate('xpack.lens.deleteLayerAriaLabel', {
        defaultMessage: `Delete layer {index}`,
        values: { index: layerIndex + 1 },
      }),
    };
  }
};

export function LayerMenu({
  onRemoveLayer,
  layerIndex,
  isOnlyLayer,
  activeVisualization,
  isLayerHidden,
  onHideLayer,
  canHideLayer,
}: {
  onRemoveLayer: () => void;
  layerIndex: number;
  isOnlyLayer: boolean;
  activeVisualization: Visualization;
  isLayerHidden?: boolean;
  onHideLayer: () => void;
  canHideLayer?: boolean;
}) {
  const { ariaLabel, buttonText } = getDeleteText(
    !!activeVisualization.removeLayer,
    isOnlyLayer,
    layerIndex
  );
  const [isPopoverOpen, setPopover] = useState(false);
  const smallContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'smallContextMenuPopover',
  });

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const items = [
    <EuiContextMenuItem
      aria-label={ariaLabel}
      title={ariaLabel}
      key="delete"
      data-test-subj="lnsLayerRemove"
      icon={isOnlyLayer ? 'eraser' : 'trash'}
      color="danger"
      onClick={() => {
        // If we don't blur the remove / clear button, it remains focused
        // which is a strange UX in this case. e.target.blur doesn't work
        // due to who knows what, but probably event re-writing. Additionally,
        // activeElement does not have blur so, we need to do some casting + safeguards.
        const el = document.activeElement as unknown as { blur: () => void };

        if (el?.blur) {
          el.blur();
        }

        onRemoveLayer();
        closePopover();
      }}
    >
      {buttonText}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="hide"
      disabled={!canHideLayer}
      icon={isLayerHidden ? 'eye' : 'eyeClosed'}
      onClick={() => {
        onHideLayer();
        closePopover();
      }}
    >
      {isLayerHidden
        ? i18n.translate('xpack.lens.showLayer', {
            defaultMessage: 'Show',
          })
        : i18n.translate('xpack.lens.hideLayer', {
            defaultMessage: 'Hide',
          })}
    </EuiContextMenuItem>,
  ];

  const button = (
    <EuiButtonIcon
      iconType="boxesHorizontal"
      onClick={onButtonClick}
      data-test-subj="lnsLayerMenu"
      aria-label={i18n.translate('xpack.lens.contextualLayerMenu', {
        defaultMessage: `Open actions for layer {index}`,
        values: { index: layerIndex + 1 },
      })}
      title={i18n.translate('xpack.lens.contextualLayerMenu', {
        defaultMessage: `Open actions for layer {index}`,
        values: { index: layerIndex + 1 },
      })}
    />
  );

  return (
    <EuiPopover
      id={smallContextMenuPopoverId}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiPopover>
  );
}
