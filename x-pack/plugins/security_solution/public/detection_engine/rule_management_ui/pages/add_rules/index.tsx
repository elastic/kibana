/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { SecurityPageName } from '../../../../app/types';
import { HeaderPage } from '../../../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { useKibana } from '../../../../common/lib/kibana';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';

import { useUserData } from '../../../../detections/components/user_info';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';

import * as i18n from './translations';
import { usePrebuiltRulesStatus } from '../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_status';
import { RulesTableNew } from '../../components/rules_table/rules_table_new/rules_table_new';
import { RulesTableNewContextProvider } from '../../components/rules_table/rules_table_new/rules_table_new_context';

const AddRulesPageComponent: React.FC = () => {
  const { navigateToApp } = useKibana().services.application;
  // const invalidateFindRulesQuery = useInvalidateFindRulesQuery();
  // const invalidateFetchRuleManagementFilters = useInvalidateFetchRuleManagementFiltersQuery();
  // const invalidateRules = useCallback(() => {
  //   invalidateFindRulesQuery();
  //   invalidateFetchRuleManagementFilters();
  // }, [invalidateFindRulesQuery, invalidateFetchRuleManagementFilters]);

  const { data: preBuiltRulesStatus } = usePrebuiltRulesStatus();

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
      {/* <NeedAdminForUpdateRulesCallOut />*/}
      {/* <MissingPrivilegesCallOut />*/}

      <RulesTableNewContextProvider>
        <SecuritySolutionPageWrapper>
          <HeaderPage title={i18n.PAGE_TITLE}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
              <EuiFlexItem grow={false}>
                <EuiButton fill iconType="plusInCircle">
                  {i18n.INSTALL_ALL}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </HeaderPage>
          <RulesTableNew />
        </SecuritySolutionPageWrapper>
      </RulesTableNewContextProvider>

      <SpyRoute pageName={SecurityPageName.rulesAdd} />
    </>
  );
};

export const AddRulesPage = React.memo(AddRulesPageComponent);
AddRulesPage.displayName = 'AddRulesPage';
