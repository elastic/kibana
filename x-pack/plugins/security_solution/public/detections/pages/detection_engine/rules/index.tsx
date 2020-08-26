/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { usePrePackagedRules, importRules } from '../../../containers/detection_engine/rules';
import { useListsConfig } from '../../../containers/detection_engine/lists/use_lists_config';
import {
  getDetectionEngineUrl,
  getCreateRuleUrl,
} from '../../../../common/components/link_to/redirect_to_detection_engine';
import { DetectionEngineHeaderPage } from '../../../components/detection_engine_header_page';
import { WrapperPage } from '../../../../common/components/wrapper_page';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';

import { useUserInfo } from '../../../components/user_info';
import { AllRules } from './all';
import { ImportDataModal } from '../../../../common/components/import_data_modal';
import { ReadOnlyCallOut } from '../../../components/rules/read_only_callout';
import { ValueListsModal } from '../../../components/value_lists_management_modal';
import { UpdatePrePackagedRulesCallOut } from '../../../components/rules/pre_packaged_rules/update_callout';
import {
  getPrePackagedRuleStatus,
  getPrePackagedTimelineStatus,
  redirectToDetections,
  userHasNoPermissions,
} from './helpers';
import * as i18n from './translations';
import { SecurityPageName } from '../../../../app/types';
import { LinkButton } from '../../../../common/components/links';
import { useFormatUrl } from '../../../../common/components/link_to';

type Func = (refreshPrePackagedRule?: boolean) => void;

const RulesPageComponent: React.FC = () => {
  const history = useHistory();
  const [showImportModal, setShowImportModal] = useState(false);
  const [showValueListsModal, setShowValueListsModal] = useState(false);
  const refreshRulesData = useRef<null | Func>(null);
  const {
    loading: userInfoLoading,
    isSignalIndexExists,
    isAuthenticated,
    hasEncryptionKey,
    canUserCRUD,
    hasIndexWrite,
  } = useUserInfo();
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
  const { formatUrl } = useFormatUrl(SecurityPageName.detections);

  const handleRefreshRules = useCallback(async () => {
    if (refreshRulesData.current != null) {
      refreshRulesData.current(true);
    }
  }, [refreshRulesData]);

  const handleCreatePrePackagedRules = useCallback(async () => {
    if (createPrePackagedRules != null) {
      await createPrePackagedRules();
      handleRefreshRules();
    }
  }, [createPrePackagedRules, handleRefreshRules]);

  const handleRefetchPrePackagedRulesStatus = useCallback(() => {
    if (refetchPrePackagedRulesStatus != null) {
      refetchPrePackagedRulesStatus();
    }
  }, [refetchPrePackagedRulesStatus]);

  const handleSetRefreshRulesData = useCallback((refreshRule: Func) => {
    refreshRulesData.current = refreshRule;
  }, []);

  const getMissingRulesOrTimelinesButtonTitle = useCallback(
    (missingRules: number, missingTimelines: number) => {
      if (missingRules > 0 && missingTimelines === 0)
        return i18n.RELOAD_MISSING_PREPACKAGED_RULES(missingRules);
      else if (missingRules === 0 && missingTimelines > 0)
        return i18n.RELOAD_MISSING_PREPACKAGED_TIMELINES(missingTimelines);
      else if (missingRules > 0 && missingTimelines > 0)
        return i18n.RELOAD_MISSING_PREPACKAGED_RULES_AND_TIMELINES(missingRules, missingTimelines);
    },
    []
  );

  const goToNewRule = useCallback(
    (ev) => {
      ev.preventDefault();
      history.push(getCreateRuleUrl());
    },
    [history]
  );

  if (
    redirectToDetections(
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      needsListsConfiguration
    )
  ) {
    history.replace(getDetectionEngineUrl());
    return null;
  }

  return (
    <>
      {userHasNoPermissions(canUserCRUD) && <ReadOnlyCallOut />}
      <ValueListsModal
        showModal={showValueListsModal}
        onClose={() => setShowValueListsModal(false)}
      />
      <ImportDataModal
        checkBoxLabel={i18n.OVERWRITE_WITH_SAME_NAME}
        closeModal={() => setShowImportModal(false)}
        description={i18n.SELECT_RULE}
        errorMessage={i18n.IMPORT_FAILED}
        failedDetailed={i18n.IMPORT_FAILED_DETAILED}
        importComplete={handleRefreshRules}
        importData={importRules}
        successMessage={i18n.SUCCESSFULLY_IMPORTED_RULES}
        showCheckBox={true}
        showModal={showImportModal}
        submitBtnText={i18n.IMPORT_RULE_BTN_TITLE}
        subtitle={i18n.INITIAL_PROMPT_TEXT}
        title={i18n.IMPORT_RULE}
      />
      <WrapperPage>
        <DetectionEngineHeaderPage
          backOptions={{
            href: getDetectionEngineUrl(),
            text: i18n.BACK_TO_DETECTIONS,
            pageId: SecurityPageName.detections,
          }}
          title={i18n.PAGE_TITLE}
        >
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
            {(prePackagedRuleStatus === 'ruleNotInstalled' ||
              prePackagedTimelineStatus === 'timelinesNotInstalled') && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="indexOpen"
                  isLoading={loadingCreatePrePackagedRules}
                  isDisabled={userHasNoPermissions(canUserCRUD) || loading}
                  onClick={handleCreatePrePackagedRules}
                >
                  {i18n.LOAD_PREPACKAGED_RULES}
                </EuiButton>
              </EuiFlexItem>
            )}
            {(prePackagedRuleStatus === 'someRuleUninstall' ||
              prePackagedTimelineStatus === 'someTimelineUninstall') && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="reloadPrebuiltRulesBtn"
                  iconType="plusInCircle"
                  isLoading={loadingCreatePrePackagedRules}
                  isDisabled={userHasNoPermissions(canUserCRUD) || loading}
                  onClick={handleCreatePrePackagedRules}
                >
                  {getMissingRulesOrTimelinesButtonTitle(
                    rulesNotInstalled ?? 0,
                    timelinesNotInstalled ?? 0
                  )}
                </EuiButton>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiToolTip position="top" content={i18n.UPLOAD_VALUE_LISTS_TOOLTIP}>
                <EuiButton
                  data-test-subj="open-value-lists-modal-button"
                  iconType="importAction"
                  isDisabled={!canWriteListsIndex || loading}
                  onClick={() => setShowValueListsModal(true)}
                >
                  {i18n.UPLOAD_VALUE_LISTS}
                </EuiButton>
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="importAction"
                isDisabled={userHasNoPermissions(canUserCRUD) || loading}
                onClick={() => {
                  setShowImportModal(true);
                }}
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
                isDisabled={userHasNoPermissions(canUserCRUD) || loading}
              >
                {i18n.ADD_NEW_RULE}
              </LinkButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </DetectionEngineHeaderPage>
        {(prePackagedRuleStatus === 'ruleNeedUpdate' ||
          prePackagedTimelineStatus === 'timelineNeedUpdate') && (
          <UpdatePrePackagedRulesCallOut
            loading={loadingCreatePrePackagedRules}
            numberOfUpdatedRules={rulesNotUpdated ?? 0}
            numberOfUpdatedTimelines={timelinesNotUpdated ?? 0}
            updateRules={handleCreatePrePackagedRules}
          />
        )}
        <AllRules
          createPrePackagedRules={createPrePackagedRules}
          loading={loading || prePackagedRuleLoading}
          loadingCreatePrePackagedRules={loadingCreatePrePackagedRules}
          hasNoPermissions={userHasNoPermissions(canUserCRUD)}
          refetchPrePackagedRulesStatus={handleRefetchPrePackagedRulesStatus}
          rulesCustomInstalled={rulesCustomInstalled}
          rulesInstalled={rulesInstalled}
          rulesNotInstalled={rulesNotInstalled}
          rulesNotUpdated={rulesNotUpdated}
          setRefreshRulesData={handleSetRefreshRulesData}
        />
      </WrapperPage>

      <SpyRoute pageName={SecurityPageName.detections} />
    </>
  );
};

export const RulesPage = React.memo(RulesPageComponent);
