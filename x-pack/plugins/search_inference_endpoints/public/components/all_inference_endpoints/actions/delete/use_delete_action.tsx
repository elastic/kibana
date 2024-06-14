/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiIcon, EuiTextColor } from '@elastic/eui';
import { InferenceEndpointUI } from '../../types';
import * as i18n from '../../../../../common/translations';
import type { UseActionProps } from '../types';
import { useDeleteEndpoint } from '../../../../hooks/use_delete_endpoint';

export const useDeleteAction = ({ onAction, onActionSuccess }: UseActionProps) => {
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [endpointToBeDeleted, setEndpointToBeDeleted] = useState<InferenceEndpointUI | null>(null);
  const onCloseModal = useCallback(() => setIsModalVisible(false), []);
  const openModal = useCallback(
    (selectedEndpoint: InferenceEndpointUI) => {
      onAction();
      setIsModalVisible(true);
      setEndpointToBeDeleted(selectedEndpoint);
    },
    [onAction]
  );

  const { mutate: deleteEndpoint } = useDeleteEndpoint();

  const onConfirmDeletion = useCallback(() => {
    onCloseModal();
    if (!endpointToBeDeleted) {
      return;
    }

    deleteEndpoint({
      type: endpointToBeDeleted.type,
      id: endpointToBeDeleted.endpoint,
    });
  }, [deleteEndpoint, onCloseModal, endpointToBeDeleted]);

  const getAction = (selectedEndpoint: InferenceEndpointUI) => {
    return {
      name: <EuiTextColor color={'danger'}>{i18n.DELETE_ACTION_LABEL}</EuiTextColor>,
      onClick: () => openModal(selectedEndpoint),
      icon: <EuiIcon type="trash" size="m" color={'danger'} />,
      key: 'inference-endpoint-action-delete',
    };
  };

  return { getAction, isModalVisible, onConfirmDeletion, onCloseModal };
};

export type UseDeleteAction = ReturnType<typeof useDeleteAction>;
