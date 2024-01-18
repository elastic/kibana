/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { SecurityCreateApiKeyResponse } from '@elastic/elasticsearch/lib/api/types';
import { useKibanaServices } from '../../hooks/use_kibana';

interface CreateApiKeyFlyoutProps {
  onClose: () => void;
  setApiKey: (apiKey: SecurityCreateApiKeyResponse) => void;
}

export const CreateApiKeyFlyout: React.FC<CreateApiKeyFlyoutProps> = ({ onClose, setApiKey }) => {
  const { security } = useKibanaServices();
  const apiKeyFlyout = useMemo(
    () =>
      security?.renderApiKeyFlyout?.({
        canManageCrossClusterApiKeys: false,
        onCancel: onClose,
        onSuccess: setApiKey,
      }) ?? <></>,
    [security, onClose, setApiKey]
  );
  return apiKeyFlyout;
};
