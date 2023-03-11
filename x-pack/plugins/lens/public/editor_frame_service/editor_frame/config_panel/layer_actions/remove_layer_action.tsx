/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiCheckboxProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import type { LayerAction } from '../../../../types';
import { LOCAL_STORAGE_LENS_KEY } from '../../../../settings_storage';
import type { LayerType } from '../../../../../common/types';

interface RemoveLayerAction {
  execute: () => void;
  layerIndex: number;
  layerType?: LayerType;
  isOnlyLayer: boolean;
  core: Pick<CoreStart, 'overlays' | 'theme'>;
}

const SKIP_DELETE_MODAL_KEY = 'skipDeleteModal';

const getCopy = (
  layerType: LayerType,
  isOnlyLayer?: boolean
): { buttonLabel: string; modalTitle: string; modalBody: string } => {
  if (isOnlyLayer && layerType === 'data') {
    return {
      buttonLabel: i18n.translate('xpack.lens.resetLayerAriaLabel', {
        defaultMessage: 'Clear layer',
      }),
      modalTitle: i18n.translate('xpack.lens.modalTitle.title.clearVis', {
        defaultMessage: 'Clear visualization layer?',
      }),
      modalBody: i18n.translate('xpack.lens.layer.confirmModal.clearVis', {
        defaultMessage: `Clearing this layer removes the visualization and its configurations. `,
      }),
    };
  }

  const buttonLabel = i18n.translate('xpack.lens.deleteLayerAriaLabel', {
    defaultMessage: `Delete layer`,
  });

  switch (layerType) {
    case 'data':
      return {
        buttonLabel,
        modalTitle: i18n.translate('xpack.lens.modalTitle.title.deleteVis', {
          defaultMessage: 'Delete visualization layer?',
        }),
        modalBody: i18n.translate('xpack.lens.layer.confirmModal.deleteVis', {
          defaultMessage: `Deleting this layer removes the visualization and its configurations. `,
        }),
      };

    case 'annotations':
      return {
        buttonLabel,
        modalTitle: i18n.translate('xpack.lens.modalTitle.title.deleteAnnotations', {
          defaultMessage: 'Delete annotations layer?',
        }),
        modalBody: i18n.translate('xpack.lens.layer.confirmModal.deleteAnnotation', {
          defaultMessage: `Deleting this layer removes the annotations and their configurations. `,
        }),
      };

    case 'referenceLine':
      return {
        buttonLabel,
        modalTitle: i18n.translate('xpack.lens.modalTitle.title.deleteReferenceLines', {
          defaultMessage: 'Delete reference lines layer?',
        }),
        modalBody: i18n.translate('xpack.lens.layer.confirmModal.deleteRefLine', {
          defaultMessage: `Deleting this layer removes the reference lines and their configurations. `,
        }),
      };

    default:
      throw new Error('Unknown layer type');
  }
};

const RemoveConfirmModal = ({
  modalTitle,
  modalDesc,
  skipDeleteModal,
  isDeletable,
  execute,
  closeModal,
  updateLensLocalStorage,
}: {
  modalTitle: string;
  modalDesc: string;
  skipDeleteModal: boolean;
  isDeletable?: boolean;
  execute: () => void;
  closeModal: () => void;
  updateLensLocalStorage: (partial: Record<string, unknown>) => void;
}) => {
  const [skipDeleteModalLocal, setSkipDeleteModalLocal] = useState(skipDeleteModal);
  const onChangeShouldShowModal: EuiCheckboxProps['onChange'] = useCallback(
    ({ target }) => setSkipDeleteModalLocal(target.checked),
    []
  );

  const onRemove = useCallback(() => {
    updateLensLocalStorage({
      [SKIP_DELETE_MODAL_KEY]: skipDeleteModalLocal,
    });
    closeModal();
    execute();
  }, [closeModal, execute, skipDeleteModalLocal, updateLensLocalStorage]);

  return (
    <>
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
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiCheckbox
              id={'lnsLayerRemoveModalCheckbox'}
              label={i18n.translate('xpack.lens.layer.confirmModal.dontAskAgain', {
                defaultMessage: `Don't ask me again`,
              })}
              checked={skipDeleteModalLocal}
              onChange={onChangeShouldShowModal}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" justifyContent="flexEnd" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={closeModal}>
                  {i18n.translate('xpack.lens.layer.cancelDelete', {
                    defaultMessage: `Cancel`,
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="lnsLayerRemoveConfirmButton"
                  onClick={onRemove}
                  color="danger"
                  iconType={isDeletable ? 'trash' : 'eraser'}
                  fill
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
    </>
  );
};

export const getRemoveLayerAction = (props: RemoveLayerAction): LayerAction => {
  const { buttonLabel, modalTitle, modalBody } = getCopy(
    props.layerType || LayerTypes.DATA,
    props.isOnlyLayer
  );

  return {
    id: 'removeLayerAction',
    execute: async () => {
      const storage = new Storage(localStorage);
      const lensLocalStorage = storage.get(LOCAL_STORAGE_LENS_KEY) ?? {};

      const updateLensLocalStorage = (partial: Record<string, unknown>) => {
        storage.set(LOCAL_STORAGE_LENS_KEY, {
          ...lensLocalStorage,
          ...partial,
        });
      };

      if (!lensLocalStorage.skipDeleteModal) {
        const modal = props.core.overlays.openModal(
          toMountPoint(
            <RemoveConfirmModal
              modalTitle={modalTitle}
              isDeletable={!props.isOnlyLayer}
              modalDesc={modalBody}
              skipDeleteModal={lensLocalStorage[LOCAL_STORAGE_LENS_KEY] ?? false}
              execute={props.execute}
              closeModal={() => modal.close()}
              updateLensLocalStorage={updateLensLocalStorage}
            />,
            { theme$: props.core.theme.theme$ }
          ),
          {
            'data-test-subj': 'lnsLayerRemoveModal',
          }
        );
        await modal.onClose;
      } else {
        props.execute();
      }
    },
    displayName: buttonLabel,
    isCompatible: true,
    icon: props.isOnlyLayer ? 'eraser' : 'trash',
    color: 'danger',
    'data-test-subj': `lnsLayerRemove--${props.layerIndex}`,
  };
};
