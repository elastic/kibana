/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, useState } from 'react';
import { CasesPermissions } from '@kbn/cases-plugin/common';
import { useObservabilityRouter } from '../../../../../hooks/use_router';
import { observabilityFeatureId } from '../../../../../../common/features/alerts_and_slos';
import { useKibana } from '../../../../../hooks/use_kibana';
import { usePluginContext } from '../../../../../hooks/use_plugin_context';
import { useFetchAlertDetail } from '../../../hooks/use_fetch_alert_detail';
import { useFetchAlertData } from '../../../hooks/use_fetch_alert_data';

export const LazyAlertsFlyout = lazy(
  () => import('../../../components/alerts_flyout/alerts_flyout')
);

export interface CasesProps {
  permissions: CasesPermissions;
}

export function Cases({ permissions }: CasesProps) {
  const {
    application: { navigateToUrl },
    cases: {
      ui: { getCases: CasesList },
    },
  } = useKibana().services;
  const { link } = useObservabilityRouter();

  const { observabilityRuleTypeRegistry } = usePluginContext();

  const [selectedAlertId, setSelectedAlertId] = useState<string>('');

  const [alertLoading, alertDetail] = useFetchAlertDetail(selectedAlertId);

  const handleFlyoutClose = () => setSelectedAlertId('');

  const handleShowAlertDetails = (alertId: string) => {
    setSelectedAlertId(alertId);
  };

  return (
    <>
      <CasesList
        basePath={link('/cases')}
        features={{ alerts: { sync: false, isExperimental: false } }}
        owner={[observabilityFeatureId]}
        permissions={permissions}
        ruleDetailsNavigation={{
          href: (ruleId) => link('/alerts/rules/{ruleId}', { path: { ruleId: ruleId || '' } }),
          onClick: (ruleId, ev) => {
            const ruleLink = link('/alerts/rules/{ruleId}', { path: { ruleId: ruleId || '' } });

            if (ev != null) {
              ev.preventDefault();
            }

            return navigateToUrl(ruleLink);
          },
        }}
        showAlertDetails={handleShowAlertDetails}
        useFetchAlertData={useFetchAlertData}
      />

      {alertDetail && selectedAlertId !== '' && !alertLoading ? (
        <Suspense fallback={null}>
          <LazyAlertsFlyout
            alert={alertDetail.formatted}
            rawAlert={alertDetail.raw}
            observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
            onClose={handleFlyoutClose}
          />
        </Suspense>
      ) : null}
    </>
  );
}
