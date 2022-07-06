/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { Visualization } from '../../../types';
import { LocalStorageLens, LOCAL_STORAGE_LENS_KEY } from '../../../settings_storage';
import { LayerType, layerTypes } from '../../..';

const modalDescClear = i18n.translate('xpack.lens.layer.confirmModal.clearVis', {
  defaultMessage: `Clearing this layer removes the visualization and its configurations. `,
});

const modalDescVis = i18n.translate('xpack.lens.layer.confirmModal.deleteVis', {
  defaultMessage: `Deleting this layer removes the visualization and its configurations. `,
});
const modalDescRefLine = i18n.translate('xpack.lens.layer.confirmModal.deleteRefLine', {
  defaultMessage: `Deleting this layer removes the reference lines and their configurations. `,
});
const modalDescAnnotation = i18n.translate('xpack.lens.layer.confirmModal.deleteAnnotation', {
  defaultMessage: `Deleting this layer removes the annotations and their configurations. `,
});

const getButtonCopy = (
  layerIndex: number,
  layerType: LayerType,
  canBeRemoved?: boolean,
  isOnlyLayer?: boolean
) => {
  let ariaLabel;

  const layerTypeCopy =
    layerType === layerTypes.DATA
      ? i18n.translate('xpack.lens.modalTitle.layerType.data', {
          defaultMessage: 'visualization',
        })
      : layerType === layerTypes.ANNOTATIONS
      ? i18n.translate('xpack.lens.modalTitle.layerType.annotation', {
          defaultMessage: 'annotations',
        })
      : i18n.translate('xpack.lens.modalTitle.layerType.refLines', {
          defaultMessage: 'reference lines',
        });

  let modalTitle = i18n.translate('xpack.lens.modalTitle.title', {
    defaultMessage: 'Delete {layerType} layer?',
    values: { layerType: layerTypeCopy },
  });
  let modalDesc = modalDescVis;

  if (!canBeRemoved || isOnlyLayer) {
    modalTitle = i18n.translate('xpack.lens.modalTitle.title', {
      defaultMessage: 'Clear {layerType} layer?',
      values: { layerType: layerTypeCopy },
    });
    modalDesc = modalDescClear;
  }

  if (layerType === layerTypes.ANNOTATIONS) {
    modalDesc = modalDescAnnotation;
  } else if (layerType === layerTypes.REFERENCELINE) {
    modalDesc = modalDescRefLine;
  }

  if (!canBeRemoved) {
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

  return {
    ariaLabel,
    modalTitle,
    modalDesc,
  };
};

export function RemoveLayerButton({
  onRemoveLayer,
  layerIndex,
  isOnlyLayer,
  activeVisualization,
  layerType,
}: {
  onRemoveLayer: () => void;
  layerIndex: number;
  isOnlyLayer: boolean;
  activeVisualization: Visualization;
  layerType?: LayerType;
}) {
  const { ariaLabel, modalTitle, modalDesc } = getButtonCopy(
    layerIndex,
    layerType || layerTypes.DATA,
    !!activeVisualization.removeLayer,
    isOnlyLayer
  );

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
        <RemoveConfirmModal
          modalTitle={modalTitle}
          isDeletable={!!activeVisualization.removeLayer && !isOnlyLayer}
          modalDesc={modalDesc}
          closeModal={closeModal}
          skipDeleteModal={lensLocalStorage?.skipDeleteModal}
          onChangeShouldShowModal={onChangeShouldShowModal}
          removeLayer={removeLayer}
        />
      ) : null}
    </>
  );
}

const RemoveConfirmModal = ({
  modalTitle,
  modalDesc,
  closeModal,
  skipDeleteModal,
  onChangeShouldShowModal,
  isDeletable,
  removeLayer,
}: {
  modalTitle: string;
  modalDesc: string;
  closeModal: () => void;
  skipDeleteModal?: boolean;
  isDeletable?: boolean;
  onChangeShouldShowModal: () => void;
  removeLayer: () => void;
}) => {
  return (
    <EuiModal data-test-subj="lnsLayerRemoveModal" onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{modalTitle}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <p>
          {modalDesc}
          {i18n.translate('xpack.lens.layer.confirmModal.cannotUndo', {
            defaultMessage: `You can't undo this action.`,
          })}
        </p>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiCheckbox
              id={'lnsLayerRemoveModalCheckbox'}
              label={i18n.translate('xpack.lens.layer.confirmModal.dontAskAgain', {
                defaultMessage: `Don't ask me again`,
              })}
              indeterminate={skipDeleteModal}
              onChange={onChangeShouldShowModal}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={closeModal}>
                  {i18n.translate('xpack.lens.layer.cancelDelete', {
                    defaultMessage: `Cancel`,
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={() => {
                    closeModal();
                    removeLayer();
                  }}
                  fill
                  color="danger"
                  iconType={isDeletable ? 'trash' : 'eraser'}
                >
                  {isDeletable
                    ? i18n.translate('xpack.lens.layer.confirmDelete', {
                        defaultMessage: `Delete layer`,
                      })
                    : i18n.translate('xpack.lens.layer.confirmClear', {
                        defaultMessage: `Clear layer`,
                      })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
