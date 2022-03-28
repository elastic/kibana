/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { usePrePackagedRules, importRules } from '../../../containers/detection_engine/rules';
import { useListsConfig } from '../../../containers/detection_engine/lists/use_lists_config';
import {
  getDetectionEngineUrl,
  getCreateRuleUrl,
} from '../../../../common/components/link_to/redirect_to_detection_engine';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';

import { useUserData } from '../../../components/user_info';
import { AllRules } from './all';
import { ImportDataModal } from '../../../../common/components/import_data_modal';
import { ValueListsModal } from '../../../components/value_lists_management_modal';
import { UpdatePrePackagedRulesCallOut } from '../../../components/rules/pre_packaged_rules/update_callout';
import {
  getPrePackagedRuleStatus,
  getPrePackagedTimelineStatus,
  redirectToDetections,
  userHasPermissions,
} from './helpers';
import * as i18n from './translations';
import { SecurityPageName } from '../../../../app/types';
import { LinkButton } from '../../../../common/components/links';
import { useFormatUrl } from '../../../../common/components/link_to';
import { NeedAdminForUpdateRulesCallOut } from '../../../components/callouts/need_admin_for_update_callout';
import { MlJobCompatibilityCallout } from '../../../components/callouts/ml_job_compatibility_callout';
import { MissingPrivilegesCallOut } from '../../../components/callouts/missing_privileges_callout';
import { APP_UI_ID } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { HeaderPage } from '../../../../common/components/header_page';
import { RulesTableContextProvider } from './all/rules_table/rules_table_context';
import { useInvalidateRules } from '../../../containers/detection_engine/rules/use_find_rules_query';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { useExecutionContext } from '../../../../../../../../src/plugins/kibana_react/public';

const RulesPageComponent: React.FC = () => {
  const [isImportModalVisible, showImportModal, hideImportModal] = useBoolState();
  const [isValueListModalVisible, showValueListModal, hideValueListModal] = useBoolState();
  const {
    application: { navigateToApp },
    executionContext,
  } = useKibana().services;
  const invalidateRules = useInvalidateRules();

  // Application ID and current URL are traced automatically.
  useExecutionContext(executionContext, {
    page: SecurityPageName.rules,
    id: 'management',
  });

  const [
    {
      loading: userInfoLoading,
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      canUserCRUD,
      hasIndexWrite,
    },
  ] = useUserData();
  const {
    loading: listsConfigLoading,
    canWriteIndex: canWriteListsIndex,
    needsConfiguration: needsListsConfiguration,
  } = useListsConfig();
  const loading = userInfoLoading || listsConfigLoading;
  const {
    createPrePackagedRules,
    loading: prePackagedRuleLoading,
    loadingCreatePrePackagedRules,
    refetchPrePackagedRulesStatus,
    rulesCustomInstalled,
    rulesInstalled,
    rulesNotInstalled,
    rulesNotUpdated,
    timelinesInstalled,
    timelinesNotInstalled,
    timelinesNotUpdated,
    getLoadPrebuiltRulesAndTemplatesButton,
    getReloadPrebuiltRulesAndTemplatesButton,
  } = usePrePackagedRules({
    canUserCRUD,
    hasIndexWrite,
    isSignalIndexExists,
    isAuthenticated,
    hasEncryptionKey,
  });
  const prePackagedRuleStatus = getPrePackagedRuleStatus(
    rulesInstalled,
    rulesNotInstalled,
    rulesNotUpdated
  );

  const prePackagedTimelineStatus = getPrePackagedTimelineStatus(
    timelinesInstalled,
    timelinesNotInstalled,
    timelinesNotUpdated
  );
  const { formatUrl } = useFormatUrl(SecurityPageName.rules);

  const handleCreatePrePackagedRules = useCallback(async () => {
    if (createPrePackagedRules != null) {
      await createPrePackagedRules();
      invalidateRules();
    }
  }, [createPrePackagedRules, invalidateRules]);

  const handleRefetchPrePackagedRulesStatus = useCallback(() => {
    if (refetchPrePackagedRulesStatus != null) {
      return refetchPrePackagedRulesStatus();
    } else {
      return Promise.resolve();
    }
  }, [refetchPrePackagedRulesStatus]);

  const goToNewRule = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(APP_UI_ID, { deepLinkId: SecurityPageName.rules, path: getCreateRuleUrl() });
    },
    [navigateToApp]
  );

  const loadPrebuiltRulesAndTemplatesButton = useMemo(
    () =>
      getLoadPrebuiltRulesAndTemplatesButton({
        isDisabled: !userHasPermissions(canUserCRUD) || loading,
        onClick: handleCreatePrePackagedRules,
      }),
    [canUserCRUD, getLoadPrebuiltRulesAndTemplatesButton, handleCreatePrePackagedRules, loading]
  );

  const reloadPrebuiltRulesAndTemplatesButton = useMemo(
    () =>
      getReloadPrebuiltRulesAndTemplatesButton({
        isDisabled: !userHasPermissions(canUserCRUD) || loading,
        onClick: handleCreatePrePackagedRules,
      }),
    [canUserCRUD, getReloadPrebuiltRulesAndTemplatesButton, handleCreatePrePackagedRules, loading]
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
      <ValueListsModal showModal={isValueListModalVisible} onClose={hideValueListModal} />
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

      <RulesTableContextProvider
        refetchPrePackagedRulesStatus={handleRefetchPrePackagedRulesStatus}
      >
        <SecuritySolutionPageWrapper>
          <HeaderPage title={i18n.PAGE_TITLE}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
              {loadPrebuiltRulesAndTemplatesButton && (
                <EuiFlexItem grow={false}>{loadPrebuiltRulesAndTemplatesButton}</EuiFlexItem>
              )}
              {reloadPrebuiltRulesAndTemplatesButton && (
                <EuiFlexItem grow={false}>{reloadPrebuiltRulesAndTemplatesButton}</EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiToolTip position="top" content={i18n.UPLOAD_VALUE_LISTS_TOOLTIP}>
                  <EuiButton
                    data-test-subj="open-value-lists-modal-button"
                    iconType="importAction"
                    isDisabled={!canWriteListsIndex || !canUserCRUD || loading}
                    onClick={showValueListModal}
                  >
                    {i18n.UPLOAD_VALUE_LISTS}
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
                <LinkButton
                  data-test-subj="create-new-rule"
                  fill
                  onClick={goToNewRule}
                  href={formatUrl(getCreateRuleUrl())}
                  iconType="plusInCircle"
                  isDisabled={!userHasPermissions(canUserCRUD) || loading}
                >
                  {i18n.ADD_NEW_RULE}
                </LinkButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </HeaderPage>
          {(prePackagedRuleStatus === 'ruleNeedUpdate' ||
            prePackagedTimelineStatus === 'timelineNeedUpdate') && (
            <UpdatePrePackagedRulesCallOut
              data-test-subj="update-callout-button"
              loading={loadingCreatePrePackagedRules}
              numberOfUpdatedRules={rulesNotUpdated ?? 0}
              numberOfUpdatedTimelines={timelinesNotUpdated ?? 0}
              updateRules={handleCreatePrePackagedRules}
            />
          )}
          <AllRules
            createPrePackagedRules={createPrePackagedRules}
            data-test-subj="all-rules"
            loading={loading || prePackagedRuleLoading}
            loadingCreatePrePackagedRules={loadingCreatePrePackagedRules}
            hasPermissions={userHasPermissions(canUserCRUD)}
            rulesCustomInstalled={rulesCustomInstalled}
            rulesInstalled={rulesInstalled}
            rulesNotInstalled={rulesNotInstalled}
            rulesNotUpdated={rulesNotUpdated}
          />
        </SecuritySolutionPageWrapper>
      </RulesTableContextProvider>

      <SpyRoute pageName={SecurityPageName.rules} />
    </>
  );
};

export const RulesPage = React.memo(RulesPageComponent);
