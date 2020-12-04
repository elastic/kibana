/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';

import { useDispatch } from '../../mappings_state_context';
import { NormalizedRuntimeField } from '../../types';

type DeleteFieldFunc = (property: NormalizedRuntimeField) => void;

interface Props {
  children: (deleteProperty: DeleteFieldFunc) => React.ReactNode;
}

interface State {
  isModalOpen: boolean;
  field?: NormalizedRuntimeField;
}

export const DeleteRuntimeFieldProvider = ({ children }: Props) => {
  const [state, setState] = useState<State>({ isModalOpen: false });
  const dispatch = useDispatch();

  const confirmButtonText = i18n.translate(
    'xpack.idxMgmt.mappingsEditor.deleteRuntimeField.confirmationModal.removeButtonLabel',
    {
      defaultMessage: 'Remove',
    }
  );

  let modalTitle: string | undefined;

  if (state.field) {
    const { source } = state.field;

    modalTitle = i18n.translate(
      'xpack.idxMgmt.mappingsEditor.deleteRuntimeField.confirmationModal.title',
      {
        defaultMessage: "Remove runtime field '{fieldName}'?",
        values: {
          fieldName: source.name,
        },
      }
    );
  }

  const deleteField: DeleteFieldFunc = (field) => {
    setState({ isModalOpen: true, field });
  };

  const closeModal = () => {
    setState({ isModalOpen: false });
  };

  const confirmDelete = () => {
    dispatch({ type: 'runtimeField.remove', value: state.field!.id });
    closeModal();
  };

  return (
    <>
      {children(deleteField)}

      {state.isModalOpen && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={modalTitle}
            data-test-subj="runtimeFieldDeleteConfirmModal"
            onCancel={closeModal}
            onConfirm={confirmDelete}
            cancelButtonText={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.deleteRuntimeField.confirmationModal.cancelButtonLabel',
              {
                defaultMessage: 'Cancel',
              }
            )}
            buttonColor="danger"
            confirmButtonText={confirmButtonText}
          />
        </EuiOverlayMask>
      )}
    </>
  );
};
