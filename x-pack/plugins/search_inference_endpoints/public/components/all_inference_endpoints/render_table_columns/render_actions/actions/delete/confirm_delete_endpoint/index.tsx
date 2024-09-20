/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiButtonEmpty, EuiConfirmModal, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import * as i18n from './translations';
import { useShowUsage } from '../../../../../../../hooks/use_delete_endpoint';
import { InferenceEndpointUI } from '../../../../../types';

interface ConfirmDeleteEndpointModalProps {
  onCancel: () => void;
  onConfirm: () => void;
  inferenceEndpoint: InferenceEndpointUI;
}

export const ConfirmDeleteEndpointModal: React.FC<ConfirmDeleteEndpointModalProps> = ({
  onCancel,
  onConfirm,
  inferenceEndpoint,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [list, setList] = useState(undefined);
  const { data } = useShowUsage({
    type: inferenceEndpoint.type,
    id: inferenceEndpoint.endpoint,
  });

  useEffect(() => {
    if (!data) return;

    setList(data);
  }, [data]);

  return (
    <EuiConfirmModal
      buttonColor="danger"
      cancelButtonText={i18n.CANCEL}
      confirmButtonText={i18n.DELETE_ACTION_LABEL}
      defaultFocusedButton="confirm"
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={i18n.DELETE_TITLE}
      confirmButtonDisabled={true}
    >
      <EuiFlexGroup gutterSize="s" direction="column">
        <EuiFlexItem grow={false}>{i18n.CONFIRM_DELETE_WARNING}</EuiFlexItem>
        <EuiFlexItem grow={false}>{inferenceEndpoint.endpoint}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          {isLoading ? (
            <EuiButtonEmpty size="xs" onClick={() => {}} isLoading>
              Scanning for usage&hellip;
            </EuiButtonEmpty>
          ) : (
            <EuiText>nothing found</EuiText>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiConfirmModal>
  );
};
