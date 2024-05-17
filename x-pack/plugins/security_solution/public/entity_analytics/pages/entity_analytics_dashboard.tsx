import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { RiskScoreEntity } from '../../../common/search_strategy';
import { ENTITY_ANALYTICS } from '../../app/translations';
import { SecurityPageName } from '../../app/types';
import { EmptyPrompt } from '../../common/components/empty_prompt';
import { FiltersGlobal } from '../../common/components/filters_global';
import { HeaderPage } from '../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SiemSearchBar } from '../../common/components/search_bar';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { InputsModelId } from '../../common/store/inputs/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useHasSecurityCapability } from '../../helper_hooks';
import { useRiskEngineStatus } from '../api/hooks/use_risk_engine_status';
import { EntityAnalyticsAnomalies } from '../components/entity_analytics_anomalies';
import { EntityAnalyticsHeader } from '../components/entity_analytics_header';
import { EntityAnalyticsRiskScores } from '../components/entity_analytics_risk_score';
import { RiskScoreUpdatePanel } from '../components/risk_score_update_panel';

const EntityAnalyticsComponent = () => {
  const { data: riskScoreEngineStatus } = useRiskEngineStatus();
  const { indicesExist, loading: isSourcererLoading, sourcererDataView } = useSourcererDataView();
  const isRiskScoreModuleLicenseAvailable = useHasSecurityCapability('entity-analytics');

  return (
    <>
      {indicesExist ? (
        <>
          <FiltersGlobal>
            <SiemSearchBar id={InputsModelId.global} sourcererDataView={sourcererDataView} />
          </FiltersGlobal>

          <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsPage">
            <HeaderPage title={ENTITY_ANALYTICS} />

            {isSourcererLoading ? (
              <EuiLoadingSpinner size="l" data-test-subj="entityAnalyticsLoader" />
            ) : (
              <EuiFlexGroup direction="column" data-test-subj="entityAnalyticsSections">
                {riskScoreEngineStatus?.isUpdateAvailable && isRiskScoreModuleLicenseAvailable && (
                  <EuiFlexItem>
                    <RiskScoreUpdatePanel />
                  </EuiFlexItem>
                )}

                <EuiFlexItem>
                  <EntityAnalyticsHeader />
                </EuiFlexItem>

                <EuiFlexItem>
                  <EntityAnalyticsRiskScores riskEntity={RiskScoreEntity.host} />
                </EuiFlexItem>

                <EuiFlexItem>
                  <EntityAnalyticsRiskScores riskEntity={RiskScoreEntity.user} />
                </EuiFlexItem>

                <EuiFlexItem>
                  <EntityAnalyticsAnomalies />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <EmptyPrompt />
      )}

      <SpyRoute pageName={SecurityPageName.entityAnalytics} />
    </>
  );
};

export const EntityAnalyticsPage = React.memo(EntityAnalyticsComponent);
