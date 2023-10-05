/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { cloneDeep } from 'lodash';
import { OverlayRef } from '@kbn/core-mount-utils-browser';
import { IToasts } from '@kbn/core-notifications-browser';
import type { LayerAction, StateSetter } from '../../../../types';
import type { XYState, XYByReferenceAnnotationLayerConfig } from '../../types';
import { annotationLayerHasUnsavedChanges } from '../../state_helpers';
import { getAnnotationLayerTitle } from '../../visualization_helpers';

export const getRevertChangesAction = ({
  state,
  layer,
  setState,
  core,
}: {
  state: XYState;
  layer: XYByReferenceAnnotationLayerConfig;
  setState: StateSetter<XYState, unknown>;
  core: Pick<CoreStart, 'overlays' | 'theme' | 'notifications'>;
}): LayerAction => {
  return {
    displayName: i18n.translate('xpack.lens.xyChart.annotations.revertChanges', {
      defaultMessage: 'Revert changes',
    }),
    description: i18n.translate('xpack.lens.xyChart.annotations.revertChangesDescription', {
      defaultMessage: 'Restores annotation group to the last saved state.',
    }),
    execute: async () => {
      const modal = core.overlays.openModal(
        toMountPoint(
          <RevertChangesConfirmModal
            modalTitle={i18n.translate('xpack.lens.modalTitle.revertAnnotationGroupTitle', {
              defaultMessage: 'Revert "{title}" changes?',
              values: { title: getAnnotationLayerTitle(layer) },
            })}
            onCancel={() => modal.close()}
            onConfirm={() => {
              revert({ setState, layer, state, modal, toasts: core.notifications.toasts });
            }}
          />,
          {
            theme$: core.theme.theme$,
          }
        ),
        {
          'data-test-subj': 'lnsAnnotationLayerRevertModal',
          maxWidth: 600,
        }
      );
      await modal.onClose;
    },
    icon: 'editorUndo',
    isCompatible: true,
    disabled: !annotationLayerHasUnsavedChanges(layer),
    'data-test-subj': 'lnsXY_annotationLayer_revertChanges',
    order: 200,
  };
};

export const revert = ({
  setState,
  layer,
  state,
  modal,
  toasts,
}: {
  setState: StateSetter<XYState>;
  layer: XYByReferenceAnnotationLayerConfig;
  state: XYState;
  modal: OverlayRef;
  toasts: IToasts;
}) => {
  const newLayer: XYByReferenceAnnotationLayerConfig = {
    layerId: layer.layerId,
    layerType: layer.layerType,
    annotationGroupId: layer.annotationGroupId,

    indexPatternId: layer.__lastSaved.indexPatternId,
    ignoreGlobalFilters: layer.__lastSaved.ignoreGlobalFilters,
    annotations: cloneDeep(layer.__lastSaved.annotations),
    __lastSaved: layer.__lastSaved,
  };
  setState({
    ...state,
    layers: state.layers.map((layerToCheck) =>
      layerToCheck.layerId === layer.layerId ? newLayer : layerToCheck
    ),
  });

  modal.close();

  toasts.addSuccess({
    title: i18n.translate('xpack.lens.xyChart.annotations.notificationReverted', {
      defaultMessage: `Reverted "{title}"`,
      values: { title: getAnnotationLayerTitle(layer) },
    }),
    text: i18n.translate('xpack.lens.xyChart.annotations.notificationRevertedExplanation', {
      defaultMessage: 'The most recently saved version of this annotation group has been restored.',
    }),
  });
};

const RevertChangesConfirmModal = ({
  modalTitle,
  onConfirm,
  onCancel,
}: {
  modalTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{modalTitle}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <p>
          {i18n.translate('xpack.lens.layer.revertModal.revertAnnotationGroupDescription', {
            defaultMessage: `This action will remove all unsaved changes that you've made and restore the most recent saved version of this annotation group to you visualization. Any lost unsaved changes cannot be restored.`,
          })}
        </p>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" justifyContent="flexEnd" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onCancel}>
                  {i18n.translate('xpack.lens.layer.cancelDelete', {
                    defaultMessage: `Cancel`,
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="lnsLayerRevertChangesButton"
                  onClick={onConfirm}
                  color="warning"
                  iconType="returnKey"
                  fill
                >
                  {i18n.translate('xpack.lens.layer.unlinkConfirm', {
                    defaultMessage: 'Revert changes',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </>
  );
};
