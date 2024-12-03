/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useInstalledSecurityJobs } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';
import { useBoolState } from '../../../../../common/hooks/use_bool_state';
import { affectedJobIds } from '../../../../../../common/machine_learning/affected_job_ids';
import { useAsyncConfirmation } from '../rules_table/use_async_confirmation';

export const useMlJobUpgradeModal = () => {
  const [isVisible, showModal, hideModal] = useBoolState(false);
  const { loading: loadingJobs, jobs } = useInstalledSecurityJobs();
  const legacyJobsInstalled = jobs.filter((job) => affectedJobIds.includes(job.id));
  const [confirmLegacyMLJobs, handleConfirm, handleCancel] = useAsyncConfirmation({
    onInit: showModal,
    onFinish: hideModal,
  });

  const handleLegacyMLJobsConfirm = useCallback(async () => {
    if (legacyJobsInstalled.length > 0) {
      return confirmLegacyMLJobs();
    }
    return true;
  }, [confirmLegacyMLJobs, legacyJobsInstalled]);

  return {
    isVisible,
    legacyJobsInstalled,
    confirmLegacyMLJobs: handleLegacyMLJobsConfirm,
    handleConfirm,
    handleCancel,
    loadingJobs,
  };
};

export const useUpgradeConflictsModal = () => {
  const [isVisible, showModal, hideModal] = useBoolState(false);
  const [confirmConflictsUpgrade, handleConfirm, handleCancel] = useAsyncConfirmation({
    onInit: showModal,
    onFinish: hideModal,
  });

  return {
    isVisible,
    confirmConflictsUpgrade,
    handleConfirm,
    handleCancel,
  };
};
