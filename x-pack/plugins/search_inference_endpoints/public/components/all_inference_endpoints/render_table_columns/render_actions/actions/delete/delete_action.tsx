/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { isEndpointPreconfigured } from '../../../../../../utils/preconfigured_endpoint_helper';
import { useDeleteEndpoint } from '../../../../../../hooks/use_delete_endpoint';
import { InferenceEndpointUI } from '../../../../types';
import { ConfirmDeleteEndpointModal } from './confirm_delete_endpoint';

interface DeleteActionProps {
  selectedEndpoint: InferenceEndpointUI;
}

export const DeleteAction: React.FC<DeleteActionProps> = ({ selectedEndpoint }) => {
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  const { mutate: deleteEndpoint } = useDeleteEndpoint(() => setIsModalVisible(false));

  const onConfirmDeletion = () => {
    if (!selectedEndpoint) {
      return;
    }

    deleteEndpoint({
      type: selectedEndpoint.type,
      id: selectedEndpoint.endpoint,
    });
  };

  return (
    <>
      <EuiButtonIcon
        aria-label={i18n.translate('xpack.searchInferenceEndpoints.actions.deleteEndpoint', {
          defaultMessage: 'Delete inference endpoint {selectedEndpointName}',
          values: { selectedEndpointName: selectedEndpoint.endpoint },
        })}
        data-test-subj="inferenceUIDeleteAction"
        disabled={isEndpointPreconfigured(selectedEndpoint.endpoint)}
        key="delete"
        iconType="trash"
        color="danger"
        onClick={() => setIsModalVisible(true)}
      />
      {isModalVisible && (
        <ConfirmDeleteEndpointModal
          onCancel={() => setIsModalVisible(false)}
          onConfirm={onConfirmDeletion}
          inferenceEndpoint={selectedEndpoint}
        />
      )}
    </>
  );
};
