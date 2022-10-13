/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { affectedJobIds } from '../../callouts/ml_job_compatibility_callout/affected_job_ids';
import { MlJobUpgradeModal } from '../../modals/ml_job_upgrade_modal';
import { useInstalledSecurityJobs } from '../../../../common/components/ml/hooks/use_installed_security_jobs';

import * as i18n from './translations';
import { SecuritySolutionLinkButton } from '../../../../common/components/links';
import { SecurityPageName } from '../../../../app/types';
import { usePrePackagedRules } from '../../../../detection_engine/rule_management/logic';

const EmptyPrompt = styled(EuiEmptyPrompt)`
  align-self: center; /* Corrects horizontal centering in IE11 */
`;

EmptyPrompt.displayName = 'EmptyPrompt';

interface PrePackagedRulesPromptProps {
  createPrePackagedRules: () => void;
  loading: boolean;
  userHasPermissions: boolean;
}

const PrePackagedRulesPromptComponent: React.FC<PrePackagedRulesPromptProps> = ({
  createPrePackagedRules,
  loading = false,
  userHasPermissions = false,
}) => {
  const { loading: loadingJobs, jobs } = useInstalledSecurityJobs();
  const legacyJobsInstalled = jobs.filter((job) => affectedJobIds.includes(job.id));
  const [isUpgradeModalVisible, setIsUpgradeModalVisible] = useState(false);

  const { getLoadPrebuiltRulesAndTemplatesButton } = usePrePackagedRules();

  // Wrapper to add confirmation modal for users who may be running older ML Jobs that would
  // be overridden by updating their rules. For details, see: https://github.com/elastic/kibana/issues/128121
  const mlJobUpgradeModalConfirm = useCallback(() => {
    setIsUpgradeModalVisible(false);
    createPrePackagedRules();
  }, [createPrePackagedRules, setIsUpgradeModalVisible]);

  const loadPrebuiltRulesAndTemplatesButton = useMemo(
    () =>
      getLoadPrebuiltRulesAndTemplatesButton({
        isDisabled: !userHasPermissions || loading || loadingJobs,
        onClick: () => {
          if (legacyJobsInstalled.length > 0) {
            setIsUpgradeModalVisible(true);
          } else {
            createPrePackagedRules();
          }
        },
        fill: true,
        'data-test-subj': 'load-prebuilt-rules',
      }),
    [
      getLoadPrebuiltRulesAndTemplatesButton,
      userHasPermissions,
      loading,
      loadingJobs,
      legacyJobsInstalled,
      createPrePackagedRules,
    ]
  );

  return (
    <EmptyPrompt
      data-test-subj="rulesEmptyPrompt"
      title={<h2>{i18n.PRE_BUILT_TITLE}</h2>}
      body={<p>{i18n.PRE_BUILT_MSG}</p>}
      actions={
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>{loadPrebuiltRulesAndTemplatesButton}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SecuritySolutionLinkButton
              isDisabled={!userHasPermissions}
              iconType="plusInCircle"
              deepLinkId={SecurityPageName.rulesCreate}
            >
              {i18n.CREATE_RULE_ACTION}
            </SecuritySolutionLinkButton>
          </EuiFlexItem>
          {isUpgradeModalVisible && (
            <MlJobUpgradeModal
              jobs={legacyJobsInstalled}
              onCancel={() => setIsUpgradeModalVisible(false)}
              onConfirm={mlJobUpgradeModalConfirm}
            />
          )}
        </EuiFlexGroup>
      }
    />
  );
};

export const PrePackagedRulesPrompt = memo(PrePackagedRulesPromptComponent);
