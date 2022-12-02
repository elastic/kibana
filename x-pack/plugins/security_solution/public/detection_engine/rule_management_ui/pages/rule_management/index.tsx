/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';

import { APP_UI_ID } from '../../../../../common/constants';
import { SecurityPageName } from '../../../../app/types';
import { HeaderPage } from '../../../../common/components/header_page';
import { ImportDataModal } from '../../../../common/components/import_data_modal';
import { SecuritySolutionLinkButton } from '../../../../common/components/links';
import { getDetectionEngineUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { useKibana } from '../../../../common/lib/kibana';
import { hasUserCRUDPermission } from '../../../../common/utils/privileges';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';

import { MissingPrivilegesCallOut } from '../../../../detections/components/callouts/missing_privileges_callout';
import { MlJobCompatibilityCallout } from '../../../../detections/components/callouts/ml_job_compatibility_callout';
import { NeedAdminForUpdateRulesCallOut } from '../../../../detections/components/callouts/need_admin_for_update_callout';
import { LoadPrePackagedRules } from '../../../../detections/components/rules/pre_packaged_rules/load_prepackaged_rules';
import { LoadPrePackagedRulesButton } from '../../../../detections/components/rules/pre_packaged_rules/load_prepackaged_rules_button';
import { UpdatePrePackagedRulesCallOut } from '../../../../detections/components/rules/pre_packaged_rules/update_callout';
import { ValueListsFlyout } from '../../../../detections/components/value_lists_management_flyout';
import { useUserData } from '../../../../detections/components/user_info';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';
import { redirectToDetections } from '../../../../detections/pages/detection_engine/rules/helpers';

import { useInvalidateFindRulesQuery } from '../../../rule_management/api/hooks/use_find_rules_query';
import { importRules } from '../../../rule_management/logic';
import { usePrePackagedRulesInstallationStatus } from '../../../rule_management/logic/use_pre_packaged_rules_installation_status';
import { usePrePackagedTimelinesInstallationStatus } from '../../../rule_management/logic/use_pre_packaged_timelines_installation_status';

import { AllRules } from '../../components/rules_table';
import { RulesTableContextProvider } from '../../components/rules_table/rules_table/rules_table_context';

import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';
import { RulesPageTourComponent } from '../../components/rules_table/alternative_tour/tour';
import { useInvalidateFetchRuleManagementFiltersQuery } from '../../../rule_management/api/hooks/use_fetch_rule_management_filters_query';

const RulesPageComponent: React.FC = () => {
  const [isImportModalVisible, showImportModal, hideImportModal] = useBoolState();
  const [isValueListFlyoutVisible, showValueListFlyout, hideValueListFlyout] = useBoolState();
  const { navigateToApp } = useKibana().services.application;
  const invalidateFindRulesQuery = useInvalidateFindRulesQuery();
  const invalidateFetchRuleManagementFilters = useInvalidateFetchRuleManagementFiltersQuery();
  const invalidateRules = useCallback(() => {
    invalidateFindRulesQuery();
    invalidateFetchRuleManagementFilters();
  }, [invalidateFindRulesQuery, invalidateFetchRuleManagementFilters]);

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
  const prePackagedRuleStatus = usePrePackagedRulesInstallationStatus();
  const prePackagedTimelineStatus = usePrePackagedTimelinesInstallationStatus();

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
      <ValueListsFlyout showFlyout={isValueListFlyoutVisible} onClose={hideValueListFlyout} />
      <ImportDataModal
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
              <EuiFlexItem grow={false}>
                <LoadPrePackagedRules>
                  {(renderProps) => <LoadPrePackagedRulesButton {...renderProps} />}
                </LoadPrePackagedRules>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip position="top" content={i18n.UPLOAD_VALUE_LISTS_TOOLTIP}>
                  <EuiButton
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
                  isDisabled={!hasUserCRUDPermission(canUserCRUD) || loading}
                  onClick={showImportModal}
                >
                  {i18n.IMPORT_RULE}
                </EuiButton>
              </EuiFlexItem>
              <RulesPageTourComponent>
                <EuiFlexItem grow={false}>
                  <SecuritySolutionLinkButton
                    data-test-subj="create-new-rule"
                    fill
                    iconType="plusInCircle"
                    isDisabled={!hasUserCRUDPermission(canUserCRUD) || loading}
                    deepLinkId={SecurityPageName.rulesCreate}
                  >
                    {i18n.ADD_NEW_RULE}
                  </SecuritySolutionLinkButton>
                </EuiFlexItem>
              </RulesPageTourComponent>
            </EuiFlexGroup>
          </HeaderPage>
          {(prePackagedRuleStatus === 'ruleNeedUpdate' ||
            prePackagedTimelineStatus === 'timelineNeedUpdate') && (
            <UpdatePrePackagedRulesCallOut data-test-subj="update-callout-button" />
          )}
          <AllRules data-test-subj="all-rules" />
        </SecuritySolutionPageWrapper>
      </RulesTableContextProvider>

      <SpyRoute pageName={SecurityPageName.rules} />
    </>
  );
};

export const RulesPage = React.memo(RulesPageComponent);
