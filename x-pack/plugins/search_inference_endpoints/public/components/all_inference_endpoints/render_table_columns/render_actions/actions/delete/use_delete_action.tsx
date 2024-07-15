/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem, EuiIcon } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import * as i18n from '../../../../../../../common/translations';
import { useDeleteEndpoint } from '../../../../../../hooks/use_delete_endpoint';
import { InferenceEndpointUI } from '../../../../types';
import type { UseActionProps } from '../types';

export const useDeleteAction = ({ onActionSuccess }: UseActionProps) => {
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [endpointToBeDeleted, setEndpointToBeDeleted] = useState<InferenceEndpointUI | null>(null);
  const onCloseModal = useCallback(() => setIsModalVisible(false), []);
  const openModal = useCallback(
    (selectedEndpoint: InferenceEndpointUI) => {
      onActionSuccess();
      setIsModalVisible(true);
      setEndpointToBeDeleted(selectedEndpoint);
    },
    [onActionSuccess]
  );

  const { mutate: deleteEndpoint } = useDeleteEndpoint();

  const onConfirmDeletion = useCallback(() => {
    onCloseModal();
    if (!endpointToBeDeleted) {
      return;
    }

    deleteEndpoint({
      type: endpointToBeDeleted.type,
      id: endpointToBeDeleted.endpoint.model_id,
    });
  }, [deleteEndpoint, onCloseModal, endpointToBeDeleted]);

  const getAction = (selectedEndpoint: InferenceEndpointUI) => {
    return (
      <EuiContextMenuItem
        key="delete"
        icon={<EuiIcon type="trash" size="m" color={'danger'} />}
        onClick={() => openModal(selectedEndpoint)}
      >
        {i18n.DELETE_ACTION_LABEL}
      </EuiContextMenuItem>
    );
  };

  return { getAction, isModalVisible, onConfirmDeletion, onCloseModal };
};
