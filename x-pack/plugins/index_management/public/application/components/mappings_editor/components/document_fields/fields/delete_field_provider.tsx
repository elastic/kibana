/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';

import { useMappingsState, useDispatch } from '../../../mappings_state';
import { NormalizedField } from '../../../types';
import { getAllDescendantAliases } from '../../../lib';
import { ModalConfirmationDeleteFields } from './modal_confirmation_delete_fields';

type DeleteFieldFunc = (property: NormalizedField) => void;

interface Props {
  children: (deleteProperty: DeleteFieldFunc) => React.ReactNode;
}

interface State {
  isModalOpen: boolean;
  field?: NormalizedField;
  aliases?: string[];
}

export const DeleteFieldProvider = ({ children }: Props) => {
  const [state, setState] = useState<State>({ isModalOpen: false });
  const dispatch = useDispatch();
  const { fields } = useMappingsState();
  const { byId } = fields;

  const confirmButtonText = i18n.translate(
    'xpack.idxMgmt.mappingsEditor.deleteField.confirmationModal.removeButtonLabel',
    {
      defaultMessage: 'Remove',
    }
  );

  let modalTitle: string | undefined;

  if (state.field) {
    const { isMultiField, source } = state.field;

    modalTitle = i18n.translate(
      'xpack.idxMgmt.mappingsEditor.deleteField.confirmationModal.title',
      {
        defaultMessage: "Remove {fieldType} '{fieldName}'?",
        values: {
          fieldType: isMultiField ? 'multi-field' : 'field',
          fieldName: source.name,
        },
      }
    );
  }

  const deleteField: DeleteFieldFunc = field => {
    const aliases = getAllDescendantAliases(field, fields)
      .map(id => byId[id].path.join(' > '))
      .sort();
    const hasAliases = Boolean(aliases.length);

    setState({ isModalOpen: true, field, aliases: hasAliases ? aliases : undefined });
  };

  const closeModal = () => {
    setState({ isModalOpen: false });
  };

  const confirmDelete = () => {
    dispatch({ type: 'field.remove', value: state.field!.id });
    closeModal();
  };

  return (
    <>
      {children(deleteField)}

      {state.isModalOpen && (
        <ModalConfirmationDeleteFields
          title={modalTitle!}
          childFields={state.field && state.field.childFields}
          aliases={state.aliases}
          byId={byId}
          confirmButtonText={confirmButtonText}
          onConfirm={confirmDelete}
          onCancel={closeModal}
        />
      )}
    </>
  );
};
