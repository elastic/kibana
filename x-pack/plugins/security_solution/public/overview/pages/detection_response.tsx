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
import { useUserInfo } from '../../detections/components/user_info';
import { HeaderPage } from '../../common/components/header_page';
import { useKibana, useGetUserCasesPermissions } from '../../common/lib/kibana';
import { RuleAlertsTable } from '../components/detection_response/rule_alerts_table';
import { LandingPageComponent } from '../../common/components/landing_page';
import * as i18n from './translations';
import { EmptyPage } from '../../common/components/empty_page';
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
  const { signalIndexName, canUserREAD, hasIndexRead } = useUserInfo();
  const canReadCases = useGetUserCasesPermissions()?.read;
  const canReadAlerts = canUserREAD && hasIndexRead;

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
                    {canReadAlerts && <EuiFlexItem>{'[alerts chart]'}</EuiFlexItem>}
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

                {canReadCases && <EuiFlexItem>{'[cases table]'}</EuiFlexItem>}

                {canReadAlerts && (
                  <EuiFlexItem>
                    <EuiFlexGroup>
                      <EuiFlexItem>{'[hosts table]'}</EuiFlexItem>
                      <EuiFlexItem>{'[users table]'}</EuiFlexItem>
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
