/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useState } from 'react';

import { useKibana } from '../../utils/kibana_react';
import { useFetchAlertData, useFetchAlertDetail } from './helpers';
import { CASES_OWNER, APP_ID, CASES_PATH } from './constants';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { LazyAlertsFlyout } from '../..';
import { useRootBreadcrumb } from '../../hooks/use_breadcrumbs';

interface CasesProps {
  userCanCrud: boolean;
}
export const Cases = React.memo<CasesProps>(({ userCanCrud }) => {
  const {
    cases: casesUi,
    application: { getUrlForApp, navigateToApp },
  } = useKibana().services;
  const { observabilityRuleTypeRegistry } = usePluginContext();
  const rootBreadcrumb = useRootBreadcrumb();

  const [selectedAlertId, setSelectedAlertId] = useState<string>('');

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
      {casesUi.getCases({
        appId: APP_ID,
        basePath: CASES_PATH,
        disableAlerts: true,
        userCanCrud,
        owner: [CASES_OWNER],
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
        hideSyncAlerts: true,
        rootBreadcrumbs: [rootBreadcrumb],
      })}
    </>
  );
});

Cases.displayName = 'Cases';
