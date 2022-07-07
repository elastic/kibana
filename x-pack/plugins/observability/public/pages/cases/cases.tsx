/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useState } from 'react';

import { useKibana } from '../../utils/kibana_react';
import { CASES_OWNER, CASES_PATH } from './constants';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { LazyAlertsFlyout } from '../..';
import { useFetchAlertDetail } from './use_fetch_alert_detail';
import { useFetchAlertData } from './use_fetch_alert_data';
import { UseGetUserCasesPermissions } from '../../hooks/use_get_user_cases_permissions';

interface CasesProps {
  permissions: UseGetUserCasesPermissions;
}
export const Cases = React.memo<CasesProps>(({ permissions }) => {
  const {
    cases,
    application: { getUrlForApp, navigateToApp },
  } = useKibana().services;
  const { observabilityRuleTypeRegistry } = usePluginContext();
  const [selectedAlertId, setSelectedAlertId] = useState<string>('');
  const casesPermissions = { all: permissions.crud, read: permissions.read };

  const handleFlyoutClose = useCallback(() => {
    setSelectedAlertId('');
  }, []);

  const [alertLoading, alert] = useFetchAlertDetail(selectedAlertId);

  return (
    <>
      {alertLoading === false && alert && selectedAlertId !== '' && (
        <Suspense fallback={null}>
          <LazyAlertsFlyout
            alert={alert}
            observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
            onClose={handleFlyoutClose}
          />
        </Suspense>
      )}
      {cases.ui.getCases({
        basePath: CASES_PATH,
        permissions: casesPermissions,
        owner: [CASES_OWNER],
        features: { alerts: { sync: false } },
        useFetchAlertData,
        showAlertDetails: (alertId: string) => {
          setSelectedAlertId(alertId);
        },
        ruleDetailsNavigation: {
          href: (ruleId) => {
            return getUrlForApp('management', {
              path: `/insightsAndAlerting/triggersActions/rule/${ruleId}`,
            });
          },
          onClick: async (ruleId, ev) => {
            if (ev != null) {
              ev.preventDefault();
            }
            return navigateToApp('management', {
              path: `/insightsAndAlerting/triggersActions/rule/${ruleId}`,
            });
          },
        },
      })}
    </>
  );
});

Cases.displayName = 'Cases';
