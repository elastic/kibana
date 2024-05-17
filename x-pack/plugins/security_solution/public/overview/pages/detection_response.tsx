import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { DocLinks } from '@kbn/doc-links';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { APP_ID } from '../../../common';
import { SecurityPageName } from '../../app/types';
import { HeaderPage } from '../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SiemSearchBar } from '../../common/components/search_bar';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { InputsModelId } from '../../common/store/inputs/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useSignalIndex } from '../../detections/containers/detection_engine/alerts/use_signal_index';
import { SocTrends } from '../components/detection_response/soc_trends';

import { EmptyPrompt } from '../../common/components/empty_prompt';
import { FiltersGlobal } from '../../common/components/filters_global';
import { NoPrivileges } from '../../common/components/no_privileges';
import { useGlobalFilterQuery } from '../../common/hooks/use_global_filter_query';
import { useKibana } from '../../common/lib/kibana';
import { AlertsByStatus } from '../components/detection_response/alerts_by_status';
import { CasesByStatus } from '../components/detection_response/cases_by_status';
import { CasesTable } from '../components/detection_response/cases_table';
import { HostAlertsTable } from '../components/detection_response/host_alerts_table';
import { RuleAlertsTable } from '../components/detection_response/rule_alerts_table';
import { UserAlertsTable } from '../components/detection_response/user_alerts_table';
import * as i18n from './translations';

const DetectionResponseComponent = () => {
  const { cases } = useKibana().services;
  const { filterQuery } = useGlobalFilterQuery();
  const { indicesExist, loading: isSourcererLoading, sourcererDataView } = useSourcererDataView();
  const { signalIndexName } = useSignalIndex();
  const { hasKibanaREAD, hasIndexRead } = useAlertsPrivileges();
  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);
  const canReadCases = userCasesPermissions.read;
  const canReadAlerts = hasKibanaREAD && hasIndexRead;
  const isSocTrendsEnabled = useIsExperimentalFeatureEnabled('socTrendsEnabled');
  const additionalFilters = useMemo(() => (filterQuery ? [filterQuery] : []), [filterQuery]);

  if (!canReadAlerts && !canReadCases) {
    return <NoPrivileges docLinkSelector={(docLinks: DocLinks) => docLinks.siem.privileges} />;
  }

  return (
    <>
      {indicesExist ? (
        <>
          <FiltersGlobal>
            <SiemSearchBar id={InputsModelId.global} sourcererDataView={sourcererDataView} />
          </FiltersGlobal>
          <SecuritySolutionPageWrapper data-test-subj="detectionResponsePage">
            <HeaderPage title={i18n.DETECTION_RESPONSE_TITLE} />
            {isSourcererLoading ? (
              <EuiLoadingSpinner size="l" data-test-subj="detectionResponseLoader" />
            ) : (
              <EuiFlexGroup direction="column" data-test-subj="detectionResponseSections">
                <EuiFlexItem>
                  <EuiFlexGroup>
                    {canReadAlerts && (
                      <EuiFlexItem>
                        <AlertsByStatus
                          signalIndexName={signalIndexName}
                          additionalFilters={additionalFilters}
                        />
                      </EuiFlexItem>
                    )}
                    {canReadCases && (
                      <EuiFlexItem>
                        <CasesByStatus />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiFlexGroup direction="column">
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
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    {isSocTrendsEnabled && (
                      <EuiFlexItem grow={false}>
                        <SocTrends signalIndexName={signalIndexName} />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>

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
        <EmptyPrompt />
      )}

      <SpyRoute pageName={SecurityPageName.detectionAndResponse} />
    </>
  );
};

export const DetectionResponse = React.memo(DetectionResponseComponent);
