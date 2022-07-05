/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonIcon, EuiCheckbox, EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { Visualization } from '../../../types';
import { LocalStorageLens, LOCAL_STORAGE_LENS_KEY } from '../../../settings_storage';

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
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [lensLocalStorage, setLensLocalStorage] = useLocalStorage<LocalStorageLens>(
    LOCAL_STORAGE_LENS_KEY,
    {}
  );

  const onChangeShouldShowModal = () =>
    setLensLocalStorage({
      ...lensLocalStorage,
      skipDeleteModal: !lensLocalStorage?.skipDeleteModal,
    });

  const closeModal = () => setIsModalVisible(false);
  const showModal = () => setIsModalVisible(true);

  if (!activeVisualization.removeLayer) {
    ariaLabel = i18n.translate('xpack.lens.resetVisualizationAriaLabel', {
      defaultMessage: 'Reset visualization',
    });
  } else if (isOnlyLayer) {
    ariaLabel = i18n.translate('xpack.lens.resetLayerAriaLabel', {
      defaultMessage: 'Reset layer {index}',
      values: { index: layerIndex + 1 },
    });
  } else {
    ariaLabel = i18n.translate('xpack.lens.deleteLayerAriaLabel', {
      defaultMessage: `Delete layer {index}`,
      values: { index: layerIndex + 1 },
    });
  }

  const removeLayer = () => {
    // If we don't blur the remove / clear button, it remains focused
    // which is a strange UX in this case. e.target.blur doesn't work
    // due to who knows what, but probably event re-writing. Additionally,
    // activeElement does not have blur so, we need to do some casting + safeguards.
    const el = document.activeElement as unknown as { blur: () => void };

    if (el?.blur) {
      el.blur();
    }

    onRemoveLayer();
  };

  return (
    <>
      <EuiButtonIcon
        size="xs"
        iconType={isOnlyLayer ? 'eraser' : 'trash'}
        color="danger"
        data-test-subj="lnsLayerRemove"
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={() => {
          if (lensLocalStorage?.skipDeleteModal) {
            return removeLayer();
          }
          return showModal();
        }}
      />
      {isModalVisible ? (
        <EuiConfirmModal
          data-test-subj="lnsLayerRemoveModal"
          title={ariaLabel}
          onCancel={closeModal}
          onConfirm={() => {
            closeModal();
            removeLayer();
          }}
          cancelButtonText={i18n.translate('xpack.lens.layer.cancelDelete', {
            defaultMessage: `No, don't remove`,
          })}
          confirmButtonText={i18n.translate('xpack.lens.layer.confirmDelete', {
            defaultMessage: `Yes, remove the layer`,
          })}
          defaultFocusedButton="confirm"
        >
          <p>
            {i18n.translate('xpack.lens.layer.confirmModal', {
              defaultMessage: `You're about to remove the layer content.`,
            })}
          </p>
          <p>
            {i18n.translate('xpack.lens.layer.confirmModal2', {
              defaultMessage: `Are you sure you want to do this?`,
            })}
          </p>
          <EuiCheckbox
            id={'lnsLayerRemoveModalCheckbox'}
            label={i18n.translate('xpack.lens.layer.confirmModal.dontAskAgain', {
              defaultMessage: `Never ask again`,
            })}
            indeterminate={lensLocalStorage?.skipDeleteModal}
            onChange={onChangeShouldShowModal}
          />
        </EuiConfirmModal>
      ) : null}
    </>
  );
}
