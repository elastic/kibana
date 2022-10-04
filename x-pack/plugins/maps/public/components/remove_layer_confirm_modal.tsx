/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiText } from '@elastic/eui';
import { ILayer } from '../classes/layers/layer';
import { isLayerGroup, LayerGroup } from '../classes/layers/layer_group';

export interface Props {
  layer: ILayer;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RemoveLayerConfirmModal(props: Props) {
  function renderMultiLayerWarning() {
    if (!isLayerGroup(props.layer)) {
      return null;
    }

    const children = (props.layer as LayerGroup).getChildren();
    return children.length > 0 ? (
      <p>
        {i18n.translate('xpack.maps.deleteLayerConfirmModal.multiLayerWarning', {
          defaultMessage: `Removing this layer will also remove {numChildren} nested layers.`,
          values: { numChildren: children.length },
        })}
      </p>
    ) : null;
  }

  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.maps.deleteLayerConfirmModal.title', {
        defaultMessage: 'Remove layer?',
      })}
      onCancel={props.onCancel}
      onConfirm={props.onConfirm}
      cancelButtonText={i18n.translate('xpack.maps.deleteLayerConfirmModal.cancelButtonText', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.maps.deleteLayerConfirmModal.confirmButtonText', {
        defaultMessage: 'Remove layer',
      })}
      buttonColor="danger"
      defaultFocusedButton="cancel"
    >
      <EuiText>
        {renderMultiLayerWarning()}
        <p>
          {i18n.translate('xpack.maps.deleteLayerConfirmModal.unrecoverableWarning', {
            defaultMessage: `You can't recover removed layers.`,
          })}
        </p>
      </EuiText>
    </EuiConfirmModal>
  );
}
