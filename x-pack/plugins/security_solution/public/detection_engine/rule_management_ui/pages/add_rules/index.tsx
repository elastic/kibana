/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { redirectToDetections } from '../../../../detections/pages/detection_engine/rules/helpers';
import { SecurityPageName } from '../../../../app/types';
import { HeaderPage } from '../../../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { useKibana } from '../../../../common/lib/kibana';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';

import { useUserData } from '../../../../detections/components/user_info';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';

import * as i18n from './translations';
import { AddPrebuiltRulesTable } from '../../components/rules_table/add_prebuilt_rules_table/add_prebuilt_rules_table';
import { AddPrebuiltRulesTableContextProvider } from '../../components/rules_table/add_prebuilt_rules_table/add_prebuilt_rules_table_context';
import { AddPrebuiltRulesHeaderButtons } from '../../components/rules_table/add_prebuilt_rules_table/add_prebuilt_rules_header_buttons';
import { APP_UI_ID } from '../../../../../common';
import { NeedAdminForUpdateRulesCallOut } from '../../../../detections/components/callouts/need_admin_for_update_callout';
import { MissingPrivilegesCallOut } from '../../../../detections/components/callouts/missing_privileges_callout';
import { getDetectionEngineUrl } from '../../../../common/components/link_to';

const AddRulesPageComponent: React.FC = () => {
  const { navigateToApp } = useKibana().services.application;

  const [{ isSignalIndexExists, isAuthenticated, hasEncryptionKey }] = useUserData();
  const { needsConfiguration: needsListsConfiguration } = useListsConfig();

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

      <AddPrebuiltRulesTableContextProvider>
        <SecuritySolutionPageWrapper>
          <HeaderPage title={i18n.PAGE_TITLE}>
            <AddPrebuiltRulesHeaderButtons />
          </HeaderPage>
          <AddPrebuiltRulesTable />
        </SecuritySolutionPageWrapper>
      </AddPrebuiltRulesTableContextProvider>

      <SpyRoute pageName={SecurityPageName.rulesAdd} />
    </>
  );
};

export const AddRulesPage = React.memo(AddRulesPageComponent);
AddRulesPage.displayName = 'AddRulesPage';
