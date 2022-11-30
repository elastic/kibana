/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useUserData } from '../../../detections/components/user_info';
import { useInstallPrePackagedRules } from './use_install_pre_packaged_rules';

export const useCreatePrePackagedRules = () => {
  const [{ isSignalIndexExists, isAuthenticated, hasEncryptionKey, canUserCRUD, hasIndexWrite }] =
    useUserData();
  const { mutateAsync: installPrePackagedRules, isLoading } = useInstallPrePackagedRules();

  const canCreatePrePackagedRules =
    canUserCRUD && hasIndexWrite && isAuthenticated && hasEncryptionKey && isSignalIndexExists;

  const createPrePackagedRules = useCallback(async () => {
    if (canCreatePrePackagedRules) {
      await installPrePackagedRules();
    }
  }, [canCreatePrePackagedRules, installPrePackagedRules]);

  return {
    isLoading,
    createPrePackagedRules,
    canCreatePrePackagedRules,
  };
};
