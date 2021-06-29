/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Visualization } from '../../../types';

export function RemoveLayerButton({
  onRemoveLayer,
  layerIndex,
  isOnlyLayer,
  activeVisualization,
}: {
  onRemoveLayer: () => void;
  layerIndex: number;
  isOnlyLayer: boolean;
  activeVisualization: Visualization;
}) {
  let ariaLabel;
  let componentText;

  if (!activeVisualization.removeLayer) {
    ariaLabel = i18n.translate('xpack.lens.resetVisualizationAriaLabel', {
      defaultMessage: 'Reset visualization',
    });
    componentText = i18n.translate('xpack.lens.resetVisualization', {
      defaultMessage: 'Reset visualization',
    });
  } else if (isOnlyLayer) {
    ariaLabel = i18n.translate('xpack.lens.resetLayerAriaLabel', {
      defaultMessage: 'Reset layer {index}',
      values: { index: layerIndex + 1 },
    });
    componentText = i18n.translate('xpack.lens.resetLayer', {
      defaultMessage: 'Reset layer',
    });
  } else {
    ariaLabel = i18n.translate('xpack.lens.deleteLayerAriaLabel', {
      defaultMessage: `Delete layer {index}`,
      values: { index: layerIndex + 1 },
    });
    componentText = i18n.translate('xpack.lens.deleteLayer', {
      defaultMessage: `Delete layer`,
    });
  }

  return (
    <EuiButtonEmpty
      size="xs"
      iconType="trash"
      color="danger"
      data-test-subj="lnsLayerRemove"
      aria-label={ariaLabel}
      onClick={() => {
        // If we don't blur the remove / clear button, it remains focused
        // which is a strange UX in this case. e.target.blur doesn't work
        // due to who knows what, but probably event re-writing. Additionally,
        // activeElement does not have blur so, we need to do some casting + safeguards.
        const el = (document.activeElement as unknown) as { blur: () => void };

        if (el?.blur) {
          el.blur();
        }

        onRemoveLayer();
      }}
    >
      {componentText}
    </EuiButtonEmpty>
  );
}
