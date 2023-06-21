/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { AttachmentActionType } from '../../../client/attachment_framework/types';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { DeleteAttachmentConfirmationModal } from '../delete_attachment_confirmation_modal';
import { UserActionPropertyActions } from './property_actions';
import * as i18n from './translations';
import { useDeletePropertyAction } from './use_delete_property_action';

interface Props {
  isLoading: boolean;
  totalAlerts: number;
  onDelete: () => void;
}

const AlertPropertyActionsComponent: React.FC<Props> = ({ isLoading, totalAlerts, onDelete }) => {
  const { permissions } = useCasesContext();
  const { showDeletionModal, onModalOpen, onConfirm, onCancel } = useDeletePropertyAction({
    onDelete,
  });

  const propertyActions = useMemo(() => {
    const showRemoveAlertIcon = permissions.delete;

    return [
      ...(showRemoveAlertIcon
        ? [
            {
              type: AttachmentActionType.BUTTON as const,
              color: 'danger' as const,
              disabled: false,
              iconType: 'minusInCircle',
              label: i18n.REMOVE_ALERTS(totalAlerts),
              onClick: onModalOpen,
            },
          ]
        : []),
    ];
  }, [permissions.delete, totalAlerts, onModalOpen]);

  return (
    <>
      <UserActionPropertyActions isLoading={isLoading} propertyActions={propertyActions} />
      {showDeletionModal ? (
        <DeleteAttachmentConfirmationModal
          title={i18n.REMOVE_ALERTS(totalAlerts)}
          confirmButtonText={i18n.REMOVE}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      ) : null}
    </>
  );
};

AlertPropertyActionsComponent.displayName = 'AlertPropertyActions';

export const AlertPropertyActions = React.memo(AlertPropertyActionsComponent);
