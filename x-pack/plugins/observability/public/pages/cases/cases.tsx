/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useState } from 'react';

import { CasesPermissions } from '@kbn/cases-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { CASES_OWNER, CASES_PATH } from './constants';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { LazyAlertsFlyout } from '../..';
import { useFetchAlertDetail } from '../../hooks/use_fetch_alert_detail';
import { useFetchAlertData } from '../../hooks/use_fetch_alert_data';
import { paths } from '../../config';
import { ObservabilityAppServices } from '../../application/types';

interface CasesProps {
  permissions: CasesPermissions;
}
export const Cases = React.memo<CasesProps>(({ permissions }) => {
  const {
    cases,
    http: {
      basePath: { prepend },
    },
    application: { navigateToUrl },
  } = useKibana<ObservabilityAppServices>().services;
  const { observabilityRuleTypeRegistry } = usePluginContext();
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
      {cases.ui.getCases({
        basePath: CASES_PATH,
        permissions,
        owner: [CASES_OWNER],
        features: { alerts: { sync: false, isExperimental: false } },
        useFetchAlertData,
        showAlertDetails: (alertId: string) => {
          setSelectedAlertId(alertId);
        },
        ruleDetailsNavigation: {
          href: (ruleId) => {
            return prepend(paths.observability.ruleDetails(ruleId));
          },
          onClick: async (ruleId, ev) => {
            const ruleLink = prepend(paths.observability.ruleDetails(ruleId));

            if (ev != null) {
              ev.preventDefault();
            }

            return navigateToUrl(ruleLink);
          },
        },
      })}
    </>
  );
});

Cases.displayName = 'Cases';
