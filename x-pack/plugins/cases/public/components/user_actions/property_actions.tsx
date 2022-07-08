/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback, useState } from 'react';
import { EuiConfirmModal, EuiLoadingSpinner } from '@elastic/eui';

import { PropertyActions } from '../property_actions';
import { useLensOpenVisualization } from '../markdown_editor/plugins/lens/use_lens_open_visualization';
import { CANCEL_BUTTON, CONFIRM_BUTTON } from './translations';
import { useCasesContext } from '../cases_context/use_cases_context';

export interface UserActionPropertyActionsProps {
  id: string;
  editLabel: string;
  deleteLabel?: string;
  deleteConfirmTitle?: string;
  quoteLabel: string;
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDelete?: (id: string) => void;
  onQuote: (id: string) => void;
  commentMarkdown: string;
}

const UserActionPropertyActionsComponent = ({
  id,
  editLabel,
  quoteLabel,
  deleteLabel,
  deleteConfirmTitle,
  isLoading,
  onEdit,
  onDelete,
  onQuote,
  commentMarkdown,
}: UserActionPropertyActionsProps) => {
  const { permissions } = useCasesContext();
  const { canUseEditor, actionConfig } = useLensOpenVisualization({ comment: commentMarkdown });
  const onEditClick = useCallback(() => onEdit(id), [id, onEdit]);
  const onQuoteClick = useCallback(() => onQuote(id), [id, onQuote]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const onDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const onDeleteConfirmClick = useCallback(() => {
    if (onDelete) {
      onDelete(id);
    }
    setShowDeleteConfirm(false);
  }, [id, onDelete]);

  const onDeleteCancelClick = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  const propertyActions = useMemo(() => {
    const showEditPencilIcon = permissions.all;
    const showTrashIcon = permissions.delete && deleteLabel && onDelete;
    const showQuoteIcon = permissions.all;
    const showLensEditor = permissions.all && canUseEditor && actionConfig;

    return [
      ...(showEditPencilIcon
        ? [
            {
              iconType: 'pencil',
              label: editLabel,
              onClick: onEditClick,
            },
          ]
        : []),
      ...(showTrashIcon
        ? [
            {
              iconType: 'trash',
              label: deleteLabel,
              onClick: onDeleteClick,
            },
          ]
        : []),
      ...(showQuoteIcon
        ? [
            {
              iconType: 'quote',
              label: quoteLabel,
              onClick: onQuoteClick,
            },
          ]
        : []),
      ...(showLensEditor ? [actionConfig] : []),
    ];
  }, [
    permissions.all,
    permissions.delete,
    deleteLabel,
    onDelete,
    canUseEditor,
    actionConfig,
    editLabel,
    onEditClick,
    onDeleteClick,
    quoteLabel,
    onQuoteClick,
  ]);

  if (!propertyActions.length) {
    return null;
  }

  return (
    <>
      {isLoading && <EuiLoadingSpinner data-test-subj="user-action-title-loading" />}
      {!isLoading && <PropertyActions propertyActions={propertyActions} />}
      {showDeleteConfirm ? (
        <EuiConfirmModal
          title={deleteConfirmTitle}
          onCancel={onDeleteCancelClick}
          onConfirm={onDeleteConfirmClick}
          cancelButtonText={CANCEL_BUTTON}
          confirmButtonText={CONFIRM_BUTTON}
          buttonColor="danger"
          defaultFocusedButton="confirm"
          data-test-subj="property-actions-confirm-modal"
        />
      ) : null}
    </>
  );
};
UserActionPropertyActionsComponent.displayName = 'UserActionPropertyActions';

export const UserActionPropertyActions = memo(UserActionPropertyActionsComponent);
