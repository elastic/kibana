/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useLensOpenVisualization } from '../../markdown_editor/plugins/lens/use_lens_open_visualization';
import * as i18n from './translations';
import { UserActionPropertyActions } from './property_actions';
import { DeleteAttachmentConfirmationModal } from '../delete_attachment_confirmation_modal';
import { useDeletePropertyAction } from './use_delete_property_action';

interface Props {
  isLoading: boolean;
  commentContent?: string;
  onEdit: () => void;
  onDelete: () => void;
  onQuote: () => void;
}

const UserCommentPropertyActionsComponent: React.FC<Props> = ({
  isLoading,
  commentContent,
  onEdit,
  onDelete,
  onQuote,
}) => {
  const { permissions } = useCasesContext();
  const { showDeletionModal, onModalOpen, onConfirm, onCancel } = useDeletePropertyAction({
    onDelete,
  });

  const { canUseEditor, actionConfig } = useLensOpenVisualization({
    comment: commentContent ?? '',
  });

  const propertyActions = useMemo(() => {
    const showEditPencilIcon = permissions.update;
    const showTrashIcon = permissions.delete;
    const showQuoteIcon = permissions.create;

    const showLensEditor = permissions.update && canUseEditor && actionConfig;

    return [
      ...(showEditPencilIcon
        ? [
            {
              iconType: 'pencil',
              label: i18n.EDIT_COMMENT,
              onClick: onEdit,
            },
          ]
        : []),
      ...(showTrashIcon
        ? [
            {
              iconType: 'trash',
              label: i18n.DELETE_COMMENT,
              onClick: onModalOpen,
            },
          ]
        : []),
      ...(showQuoteIcon
        ? [
            {
              iconType: 'quote',
              label: i18n.QUOTE,
              onClick: onQuote,
            },
          ]
        : []),
      ...(showLensEditor ? [actionConfig] : []),
    ];
  }, [
    permissions.update,
    permissions.delete,
    permissions.create,
    canUseEditor,
    actionConfig,
    onEdit,
    onModalOpen,
    onQuote,
  ]);

  return (
    <>
      <UserActionPropertyActions isLoading={isLoading} propertyActions={propertyActions} />
      {showDeletionModal ? (
        <DeleteAttachmentConfirmationModal
          title={i18n.DELETE_COMMENT_TITLE}
          confirmButtonText={i18n.DELETE}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      ) : null}
    </>
  );
};

UserCommentPropertyActionsComponent.displayName = 'UserCommentPropertyActions';

export const UserCommentPropertyActions = React.memo(UserCommentPropertyActionsComponent);
