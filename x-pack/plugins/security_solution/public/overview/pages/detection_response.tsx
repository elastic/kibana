/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { SiemSearchBar } from '../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { useSignalIndex } from '../../detections/containers/detection_engine/alerts/use_signal_index';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { HeaderPage } from '../../common/components/header_page';
import { useKibana, useGetUserCasesPermissions } from '../../common/lib/kibana';

import { EmptyPage } from '../../common/components/empty_page';
import { LandingPageComponent } from '../../common/components/landing_page';
import { AlertsByStatus } from '../components/detection_response/alerts_by_status';
import { HostAlertsTable } from '../components/detection_response/host_alerts_table';
import { RuleAlertsTable } from '../components/detection_response/rule_alerts_table';
import { UserAlertsTable } from '../components/detection_response/user_alerts_table';
import * as i18n from './translations';
import { CasesTable } from '../components/detection_response/cases_table';
import { CasesByStatus } from '../components/detection_response/cases_by_status';

const NoPrivilegePage: React.FC = () => {
  const { docLinks } = useKibana().services;
  const emptyPageActions = useMemo(
    () => ({
      feature: {
        icon: 'documents',
        label: i18n.GO_TO_DOCUMENTATION,
        url: `${docLinks.links.siem.privileges}`,
        target: '_blank',
      },
    }),
    [docLinks]
  );
  return (
    <EmptyPage
      data-test-subj="noPermissionPage"
      actions={emptyPageActions}
      title={i18n.NO_PERMISSIONS_TITLE}
      message={i18n.NO_PERMISSIONS_MSG}
    />
  );
};

const DetectionResponseComponent = () => {
  const { indicesExist, indexPattern, loading: isSourcererLoading } = useSourcererDataView();
  const { signalIndexName } = useSignalIndex();
  const { hasKibanaREAD, hasIndexRead } = useAlertsPrivileges();
  const canReadCases = useGetUserCasesPermissions().read;
  const canReadAlerts = hasKibanaREAD && hasIndexRead;

  if (!canReadAlerts && !canReadCases) {
    return <NoPrivilegePage />;
  }

  return (
    <>
      {indicesExist ? (
        <>
          <SecuritySolutionPageWrapper data-test-subj="detectionResponsePage">
            <HeaderPage title={i18n.DETECTION_RESPONSE_TITLE}>
              <SiemSearchBar id="global" indexPattern={indexPattern} hideFilterBar hideQueryInput />
            </HeaderPage>

            {isSourcererLoading ? (
              <EuiLoadingSpinner size="l" data-test-subj="detectionResponseLoader" />
            ) : (
              <EuiFlexGroup direction="column" data-test-subj="detectionResponseSections">
                <EuiFlexItem>
                  <EuiFlexGroup>
                    {canReadAlerts && (
                      <EuiFlexItem>
                        <AlertsByStatus signalIndexName={signalIndexName} />
                      </EuiFlexItem>
                    )}
                    {canReadCases && (
                      <EuiFlexItem>
                        <CasesByStatus />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>

                {canReadAlerts && (
                  <EuiFlexItem>
                    <RuleAlertsTable signalIndexName={signalIndexName} />
                  </EuiFlexItem>
                )}

                {canReadCases && (
                  <EuiFlexItem>
                    <CasesTable />
                  </EuiFlexItem>
                )}

                {canReadAlerts && (
                  <EuiFlexItem>
                    <EuiFlexGroup>
                      <EuiFlexItem>
                        <HostAlertsTable signalIndexName={signalIndexName} />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <UserAlertsTable signalIndexName={signalIndexName} />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            )}
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <LandingPageComponent />
      )}

      <SpyRoute pageName={SecurityPageName.detectionAndResponse} />
    </>
  );
};

export const DetectionResponse = React.memo(DetectionResponseComponent);
