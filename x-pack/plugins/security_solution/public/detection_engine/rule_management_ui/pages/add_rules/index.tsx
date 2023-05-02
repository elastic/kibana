/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiToolTip } from '@elastic/eui';

import { APP_UI_ID } from '../../../../../common/constants';
import { SecurityPageName } from '../../../../app/types';
import { HeaderPage } from '../../../../common/components/header_page';
import { ImportDataModal } from '../../../../common/components/import_data_modal';
import { SecuritySolutionLinkButton } from '../../../../common/components/links';
import { getDetectionEngineUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { useKibana } from '../../../../common/lib/kibana';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';

import { MissingPrivilegesCallOut } from '../../../../detections/components/callouts/missing_privileges_callout';
import { NeedAdminForUpdateRulesCallOut } from '../../../../detections/components/callouts/need_admin_for_update_callout';
import { LoadPrePackagedRules } from '../../../../detections/components/rules/pre_packaged_rules/load_prepackaged_rules';
import { LoadPrePackagedRulesButton } from '../../../../detections/components/rules/pre_packaged_rules/load_prepackaged_rules_button';
import { useUserData } from '../../../../detections/components/user_info';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';
import { redirectToDetections } from '../../../../detections/pages/detection_engine/rules/helpers';

import { AllRules } from '../../components/rules_table';
import { RulesTableContextProvider } from '../../components/rules_table/rules_table/rules_table_context';

import * as i18n from './translations';
import { usePrebuiltRulesStatus } from '../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_status';
import { MiniCallout } from '../../components/mini_callout/mini_callout';

const AddRulesPageComponent: React.FC = () => {
  const { navigateToApp } = useKibana().services.application;
  // const invalidateFindRulesQuery = useInvalidateFindRulesQuery();
  // const invalidateFetchRuleManagementFilters = useInvalidateFetchRuleManagementFiltersQuery();
  // const invalidateRules = useCallback(() => {
  //   invalidateFindRulesQuery();
  //   invalidateFetchRuleManagementFilters();
  // }, [invalidateFindRulesQuery, invalidateFetchRuleManagementFilters]);

  const { data: preBuiltRulesStatus } = usePrebuiltRulesStatus();
  const shouldDisplayUpdateRulesCallout =
    (preBuiltRulesStatus?.attributes?.stats?.num_prebuilt_rules_to_upgrade ?? 0) > 0;
  const shouldDisplayNewRulesCallout =
    (preBuiltRulesStatus?.attributes?.stats?.num_prebuilt_rules_to_install ?? 0) > 0;

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

  // if (
  //   redirectToDetections(
  //     isSignalIndexExists,
  //     isAuthenticated,
  //     hasEncryptionKey,
  //     needsListsConfiguration
  //   )
  // ) {
  //   navigateToApp(APP_UI_ID, {
  //     deepLinkId: SecurityPageName.alerts,
  //     path: getDetectionEngineUrl(),
  //   });
  //   return null;
  // }

  return (
    <>
      {/*<NeedAdminForUpdateRulesCallOut />*/}
      {/*<MissingPrivilegesCallOut />*/}

      <RulesTableContextProvider>
        <SecuritySolutionPageWrapper>
          <HeaderPage title={i18n.PAGE_TITLE}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
              <EuiFlexItem grow={false}>
                {/*<LoadPrePackagedRules>*/}
                {/*  {(renderProps) => <LoadPrePackagedRulesButton {...renderProps} />}*/}
                {/*</LoadPrePackagedRules>*/}
              </EuiFlexItem>
            </EuiFlexGroup>
          </HeaderPage>
          <AllRules data-test-subj="all-rules" />
        </SecuritySolutionPageWrapper>
      </RulesTableContextProvider>

      <SpyRoute pageName={SecurityPageName.rulesAdd} />
    </>
  );
};

export const AddRulesPage = React.memo(AddRulesPageComponent);
AddRulesPage.displayName = 'AddRulesPage';
