/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiKeyFlyout } from '@kbn/security-api-key-management';
import React from 'react';
import { useCurrentUser } from '../hooks/use_current_user';

interface ApiKeyFlyoutWrapperProps {
  onClose: () => void;
  onSuccess: (apiKey: { id: string; encoded: string }) => void;
}

export const ApiKeyFlyoutWrapper: React.FC<ApiKeyFlyoutWrapperProps> = ({ onClose, onSuccess }) => {
  const user = useCurrentUser();

  return <ApiKeyFlyout onCancel={onClose} onSuccess={onSuccess} currentUser={user} />;
};
