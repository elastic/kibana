/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { MlJobUpgradeModal } from '../../../../detections/components/modals/ml_job_upgrade_modal';
import { affectedJobIds } from '../../../../detections/components/callouts/ml_job_compatibility_callout/affected_job_ids';
import { useInstalledSecurityJobs } from '../../../../common/components/ml/hooks/use_installed_security_jobs';

import { usePrePackagedRules, importRules } from '../../../rule_management/logic';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';
import { getDetectionEngineUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';

import { useUserData } from '../../../../detections/components/user_info';
import { AllRules } from '../../components/rules_table';
import { ImportDataModal } from '../../../../common/components/import_data_modal';
import { ValueListsFlyout } from '../../../../detections/components/value_lists_management_flyout';
import { UpdatePrePackagedRulesCallOut } from '../../../../detections/components/rules/pre_packaged_rules/update_callout';
import {
  redirectToDetections,
  userHasPermissions,
} from '../../../../detections/pages/detection_engine/rules/helpers';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';
import { SecurityPageName } from '../../../../app/types';
import { SecuritySolutionLinkButton } from '../../../../common/components/links';
import { NeedAdminForUpdateRulesCallOut } from '../../../../detections/components/callouts/need_admin_for_update_callout';
import { MlJobCompatibilityCallout } from '../../../../detections/components/callouts/ml_job_compatibility_callout';
import { MissingPrivilegesCallOut } from '../../../../detections/components/callouts/missing_privileges_callout';
import { APP_UI_ID } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { HeaderPage } from '../../../../common/components/header_page';
import { RulesTableContextProvider } from '../../components/rules_table/rules_table/rules_table_context';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { RULES_TABLE_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { usePrePackagedTimelinesInstallationStatus } from '../../../rule_management/logic/use_pre_packaged_timelines_installation_status';
import { usePrePackagedRulesInstallationStatus } from '../../../rule_management/logic/use_pre_packaged_rules_installation_status';
import { usePrePackagedRulesStatus } from '../../../rule_management/logic/use_pre_packaged_rules_status';
import { useCreatePrePackagedRules } from '../../../rule_management/logic/use_create_pre_packaged_rules';
import { useInvalidateRules } from '../../../rule_management/api/hooks/use_rules_query';

const RulesPageComponent: React.FC = () => {
  const [isImportModalVisible, showImportModal, hideImportModal] = useBoolState();
  const [isValueListFlyoutVisible, showValueListFlyout, hideValueListFlyout] = useBoolState();
  const { navigateToApp } = useKibana().services.application;
  const { startTransaction } = useStartTransaction();
  const invalidateRules = useInvalidateRules();

  const { loading: loadingJobs, jobs } = useInstalledSecurityJobs();
  const legacyJobsInstalled = jobs.filter((job) => affectedJobIds.includes(job.id));
  const [isUpgradeModalVisible, setIsUpgradeModalVisible] = useState(false);

  const [
    {
      loading: userInfoLoading,
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      canUserCRUD,
    },
  ] = useUserData();
  const {
    loading: listsConfigLoading,
    canWriteIndex: canWriteListsIndex,
    needsConfiguration: needsListsConfiguration,
  } = useListsConfig();
  const loading = userInfoLoading || listsConfigLoading;
  const {
    getLoadPrebuiltRulesAndTemplatesButton,
    getReloadPrebuiltRulesAndTemplatesButton,
    // TODO split this hook into multiple smaller and reusable hooks/components; Use returned props in place to avoid props-drill
  } = usePrePackagedRules();
  const { data: prePackagedRulesStatus } = usePrePackagedRulesStatus();
  const rulesNotUpdated = prePackagedRulesStatus?.rulesNotUpdated;
  const timelinesNotUpdated = prePackagedRulesStatus?.timelinesNotUpdated;

  const prePackagedRuleStatus = usePrePackagedRulesInstallationStatus();
  const prePackagedTimelineStatus = usePrePackagedTimelinesInstallationStatus();
  const {
    createPrePackagedRules,
    canCreatePrePackagedRules,
    isLoading: loadingCreatePrePackagedRules,
  } = useCreatePrePackagedRules();

  const handleCreatePrePackagedRules = useCallback(async () => {
    if (createPrePackagedRules != null) {
      startTransaction({ name: RULES_TABLE_ACTIONS.LOAD_PREBUILT });
      await createPrePackagedRules();
    }
  }, [createPrePackagedRules, startTransaction]);

  // Wrapper to add confirmation modal for users who may be running older ML Jobs that would
  // be overridden by updating their rules. For details, see: https://github.com/elastic/kibana/issues/128121
  const mlJobUpgradeModalConfirm = useCallback(async () => {
    setIsUpgradeModalVisible(false);
    await handleCreatePrePackagedRules();
  }, [handleCreatePrePackagedRules, setIsUpgradeModalVisible]);

  const showMlJobUpgradeModal = useCallback(async () => {
    if (legacyJobsInstalled.length > 0) {
      setIsUpgradeModalVisible(true);
    } else {
      await handleCreatePrePackagedRules();
    }
  }, [handleCreatePrePackagedRules, legacyJobsInstalled.length]);

  // TODO this should be a react component
  const loadPrebuiltRulesAndTemplatesButton = useMemo(
    () =>
      getLoadPrebuiltRulesAndTemplatesButton({
        isDisabled: !canCreatePrePackagedRules || loading || loadingJobs,
        onClick: showMlJobUpgradeModal,
      }),
    [
      getLoadPrebuiltRulesAndTemplatesButton,
      canCreatePrePackagedRules,
      loading,
      loadingJobs,
      showMlJobUpgradeModal,
    ]
  );

  // TODO this should be a react component
  const reloadPrebuiltRulesAndTemplatesButton = useMemo(
    () =>
      getReloadPrebuiltRulesAndTemplatesButton({
        isDisabled: !canCreatePrePackagedRules || loading || loadingJobs,
        onClick: showMlJobUpgradeModal,
      }),
    [
      getReloadPrebuiltRulesAndTemplatesButton,
      canCreatePrePackagedRules,
      loading,
      loadingJobs,
      showMlJobUpgradeModal,
    ]
  );

  if (
    redirectToDetections(
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      needsListsConfiguration
    )
  ) {
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.alerts,
      path: getDetectionEngineUrl(),
    });
    return null;
  }

  return (
    <>
      <NeedAdminForUpdateRulesCallOut />
      <MissingPrivilegesCallOut />
      <MlJobCompatibilityCallout />
      {isUpgradeModalVisible && (
        <MlJobUpgradeModal
          jobs={legacyJobsInstalled}
          onCancel={() => setIsUpgradeModalVisible(false)}
          onConfirm={mlJobUpgradeModalConfirm}
        />
      )}
      <ValueListsFlyout showFlyout={isValueListFlyoutVisible} onClose={hideValueListFlyout} />
      <ImportDataModal
        // TODO Extract it into a component and move to the platform area
        checkBoxLabel={i18n.OVERWRITE_WITH_SAME_NAME}
        closeModal={hideImportModal}
        description={i18n.SELECT_RULE}
        errorMessage={i18n.IMPORT_FAILED}
        failedDetailed={i18n.IMPORT_FAILED_DETAILED}
        importComplete={invalidateRules}
        importData={importRules}
        successMessage={i18n.SUCCESSFULLY_IMPORTED_RULES}
        showModal={isImportModalVisible}
        submitBtnText={i18n.IMPORT_RULE_BTN_TITLE}
        subtitle={i18n.INITIAL_PROMPT_TEXT}
        title={i18n.IMPORT_RULE}
        showExceptionsCheckBox
        showCheckBox
      />

      <RulesTableContextProvider>
        <SecuritySolutionPageWrapper>
          <HeaderPage title={i18n.PAGE_TITLE}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
              {loadPrebuiltRulesAndTemplatesButton && (
                // TODO Get rig of FlexItem components and other css
                <EuiFlexItem grow={false}>{loadPrebuiltRulesAndTemplatesButton}</EuiFlexItem>
              )}
              {reloadPrebuiltRulesAndTemplatesButton && (
                <EuiFlexItem grow={false}>{reloadPrebuiltRulesAndTemplatesButton}</EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiToolTip position="top" content={i18n.UPLOAD_VALUE_LISTS_TOOLTIP}>
                  <EuiButton
                    // TODO Extract it into a component and move to the platform area
                    data-test-subj="open-value-lists-modal-button"
                    iconType="importAction"
                    isDisabled={!canWriteListsIndex || !canUserCRUD || loading}
                    onClick={showValueListFlyout}
                  >
                    {i18n.IMPORT_VALUE_LISTS}
                  </EuiButton>
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="rules-import-modal-button"
                  iconType="importAction"
                  isDisabled={!userHasPermissions(canUserCRUD) || loading}
                  onClick={showImportModal}
                >
                  {i18n.IMPORT_RULE}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <SecuritySolutionLinkButton
                  data-test-subj="create-new-rule"
                  fill
                  iconType="plusInCircle"
                  isDisabled={!userHasPermissions(canUserCRUD) || loading}
                  deepLinkId={SecurityPageName.rulesCreate}
                >
                  {i18n.ADD_NEW_RULE}
                </SecuritySolutionLinkButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </HeaderPage>
          {(prePackagedRuleStatus === 'ruleNeedUpdate' ||
            prePackagedTimelineStatus === 'timelineNeedUpdate') && (
            // TODO what's the difference between this callout and PrePackagedRulesPrompt in the rules table? SHould they share common logic?
            <UpdatePrePackagedRulesCallOut
              data-test-subj="update-callout-button"
              loading={loadingCreatePrePackagedRules}
              numberOfUpdatedRules={rulesNotUpdated ?? 0}
              numberOfUpdatedTimelines={timelinesNotUpdated ?? 0}
              updateRules={showMlJobUpgradeModal}
            />
          )}
          <AllRules
            createPrePackagedRules={createPrePackagedRules}
            data-test-subj="all-rules"
            loadingCreatePrePackagedRules={loadingCreatePrePackagedRules}
            hasPermissions={userHasPermissions(canUserCRUD)}
          />
        </SecuritySolutionPageWrapper>
      </RulesTableContextProvider>

      <SpyRoute pageName={SecurityPageName.rules} />
    </>
  );
};

export const RulesPage = React.memo(RulesPageComponent);
