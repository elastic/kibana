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
import type { LayerAction } from '../../../../types';
import { LOCAL_STORAGE_LENS_KEY } from '../../../../settings_storage';

export const getUnlinkLayerAction = (props: {
  execute: () => void;
  core: Pick<CoreStart, 'overlays' | 'theme' | 'notifications'>;
}): LayerAction => {
  const { modalTitle, modalDesc } = getButtonCopy('title');

  return {
    execute: async () => {
      const storage = new Storage(localStorage);
      const lensLocalStorage = storage.get(LOCAL_STORAGE_LENS_KEY) ?? {};

      const updateLensLocalStorage = (partial: Record<string, unknown>) => {
        storage.set(LOCAL_STORAGE_LENS_KEY, {
          ...lensLocalStorage,
          ...partial,
        });
      };

      if (!lensLocalStorage.skipUnlinkFromLibraryModal) {
        const modal = props.core.overlays.openModal(
          toMountPoint(
            <UnlinkConfirmModal
              modalTitle={modalTitle}
              modalDesc={modalDesc}
              skipUnlinkFromLibraryModal={lensLocalStorage[LOCAL_STORAGE_LENS_KEY] ?? false}
              execute={props.execute}
              closeModal={() => modal.close()}
              updateLensLocalStorage={updateLensLocalStorage}
            />,
            { theme$: props.core.theme.theme$ }
          ),
          {
            'data-test-subj': 'lnsLayerUnlinkModal',
          }
        );
        await modal.onClose;
      } else {
        props.execute();
      }
    },

    description: i18n.translate('xpack.lens.xyChart.annotations.unlinksFromLibrary', {
      defaultMessage: 'Saves the annotation group as a part of the Lens Saved Object',
    }),
    displayName: i18n.translate('xpack.lens.xyChart.annotations.unlinkFromLibrary', {
      defaultMessage: 'Unlink from library',
    }),
    isCompatible: true,
    icon: 'unlink',
    'data-test-subj': 'lnsXY_annotationLayer_unlinkFromLibrary',
  };
};

const SKIP_UNLINK_FROM_LIBRARY_KEY = 'skipUnlinkFromLibraryModal';

const getButtonCopy = (title: string) => {
  const modalTitle = i18n.translate('xpack.lens.modalTitle.unlinkAnnotationGroupTitle', {
    defaultMessage: 'Unlink "{title}" from library?',
    values: { title },
  });
  const modalDesc = i18n.translate(
    'xpack.lens.layer.unlinkModal.unlinkAnnotationGroupDescription',
    {
      defaultMessage: `Unlinking from the library will cause this annotation group to be saved locally to this visualization. Any changes made will no longer be shared with the originating annotation library group.`,
    }
  );

  return {
    modalTitle,
    modalDesc,
  };
};

export const UnlinkConfirmModal = ({
  modalTitle,
  modalDesc,
  skipUnlinkFromLibraryModal,
  execute,
  closeModal,
  updateLensLocalStorage,
}: {
  modalTitle: string;
  modalDesc: string;
  skipUnlinkFromLibraryModal: boolean;
  execute: () => void;
  closeModal: () => void;
  updateLensLocalStorage: (partial: Record<string, unknown>) => void;
}) => {
  const [skipDeleteModalLocal, setSkipDeleteModalLocal] = useState(skipUnlinkFromLibraryModal);
  const onChangeShouldShowModal: EuiCheckboxProps['onChange'] = useCallback(
    ({ target }) => setSkipDeleteModalLocal(target.checked),
    []
  );

  const onUnlink = useCallback(() => {
    updateLensLocalStorage({
      [SKIP_UNLINK_FROM_LIBRARY_KEY]: skipDeleteModalLocal,
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
          {i18n.translate('xpack.lens.layer.unlinkModal.cannotUndo', {
            defaultMessage: `You can't undo this action.`,
          })}
        </p>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiCheckbox
              id={'lnsLayerRemoveModalCheckbox'}
              label={i18n.translate('xpack.lens.layer.unlinkModal.dontAskAgain', {
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
                  data-test-subj="lnsLayerUnlinkConfirmButton"
                  onClick={onUnlink}
                  color="warning"
                  iconType="unlink"
                  fill
                >
                  {i18n.translate('xpack.lens.layer.unlinkConfirm', {
                    defaultMessage: `Unlink`,
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
