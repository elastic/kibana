/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useCasesContext } from '../../cases_context/use_cases_context';
import * as i18n from './translations';
import { UserActionPropertyActions } from './property_actions';
import { DeleteAttachmentConfirmationModal } from '../delete_attachment_confirmation_modal';
import { useDeletePropertyAction } from './use_delete_property_action';

interface Props {
  isLoading: boolean;
  onDelete: () => void;
}

const RegisteredAttachmentsPropertyActionsComponent: React.FC<Props> = ({
  isLoading,
  onDelete,
}) => {
  const { permissions } = useCasesContext();
  const { showDeletionModal, onModalOpen, onConfirm, onCancel } = useDeletePropertyAction({
    onDelete,
  });

  const propertyActions = useMemo(() => {
    const showTrashIcon = permissions.delete;

    return [
      ...(showTrashIcon
        ? [
            {
              iconType: 'trash',
              color: 'danger' as const,
              label: i18n.DELETE_ATTACHMENT,
              onClick: onModalOpen,
            },
          ]
        : []),
    ];
  }, [permissions.delete, onModalOpen]);

  return (
    <>
      <UserActionPropertyActions isLoading={isLoading} propertyActions={propertyActions} />
      {showDeletionModal ? (
        <DeleteAttachmentConfirmationModal
          title={i18n.DELETE_ATTACHMENT}
          confirmButtonText={i18n.DELETE}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      ) : null}
    </>
  );
};

RegisteredAttachmentsPropertyActionsComponent.displayName = 'RegisteredAttachmentsPropertyActions';

export const RegisteredAttachmentsPropertyActions = React.memo(
  RegisteredAttachmentsPropertyActionsComponent
);
