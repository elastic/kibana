/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useInstalledSecurityJobs } from '../../../../common/components/ml/hooks/use_installed_security_jobs';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { RULES_TABLE_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { useCreatePrePackagedRules } from '../../../../detection_engine/rule_management/logic/use_create_pre_packaged_rules';
import { usePrePackagedRulesStatus } from '../../../../detection_engine/rule_management/logic/use_pre_packaged_rules_status';
import { affectedJobIds } from '../../callouts/ml_job_compatibility_callout/affected_job_ids';
import { MlJobUpgradeModal } from '../../modals/ml_job_upgrade_modal';

interface LoadPrePackagedRulesRenderProps {
  isLoading: boolean;
  isDisabled: boolean;
  onClick: () => Promise<void>;
}

interface LoadPrePackagedRulesProps {
  children: (renderProps: LoadPrePackagedRulesRenderProps) => React.ReactNode;
}

export const LoadPrePackagedRules = ({ children }: LoadPrePackagedRulesProps) => {
  const { isFetching: isFetchingPrepackagedStatus } = usePrePackagedRulesStatus();
  const {
    createPrePackagedRules,
    canCreatePrePackagedRules,
    isLoading: loadingCreatePrePackagedRules,
  } = useCreatePrePackagedRules();

  const { startTransaction } = useStartTransaction();
  const handleCreatePrePackagedRules = useCallback(async () => {
    startTransaction({ name: RULES_TABLE_ACTIONS.LOAD_PREBUILT });
    await createPrePackagedRules();
  }, [createPrePackagedRules, startTransaction]);

  const [isUpgradeModalVisible, showUpgradeModal, hideUpgradeModal] = useBoolState(false);
  const { loading: loadingJobs, jobs } = useInstalledSecurityJobs();
  const legacyJobsInstalled = jobs.filter((job) => affectedJobIds.includes(job.id));

  const handleInstallPrePackagedRules = useCallback(async () => {
    if (legacyJobsInstalled.length > 0) {
      showUpgradeModal();
    } else {
      await handleCreatePrePackagedRules();
    }
  }, [handleCreatePrePackagedRules, legacyJobsInstalled.length, showUpgradeModal]);

  // Wrapper to add confirmation modal for users who may be running older ML Jobs that would
  // be overridden by updating their rules. For details, see: https://github.com/elastic/kibana/issues/128121
  const mlJobUpgradeModalConfirm = useCallback(() => {
    hideUpgradeModal();
    handleCreatePrePackagedRules();
  }, [handleCreatePrePackagedRules, hideUpgradeModal]);

  const isDisabled = !canCreatePrePackagedRules || isFetchingPrepackagedStatus || loadingJobs;

  return (
    <>
      {children({
        isLoading: loadingCreatePrePackagedRules,
        isDisabled,
        onClick: handleInstallPrePackagedRules,
      })}
      {isUpgradeModalVisible && (
        <MlJobUpgradeModal
          jobs={legacyJobsInstalled}
          onCancel={() => hideUpgradeModal()}
          onConfirm={mlJobUpgradeModalConfirm}
        />
      )}
    </>
  );
};
