/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { Panel } from '../../common/components/panel';
import { ENTITY_ANALYTICS } from '../../app/translations';
import { HeaderSection } from '../../common/components/header_section';
import { InspectButtonContainer } from '../../common/components/inspect';
import { inputsSelectors } from '../../common/store/inputs';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../common/hooks/use_selector';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { SiemSearchBar } from '../../common/components/search_bar';
import { FiltersGlobal } from '../../common/components/filters_global';
import { RiskScore } from '../../explore/components/risk_score/severity/common';
import { StyledBasicTable } from '../components/entity_analytics/common/styled_basic_table';
import { InputsModelId } from '../../common/store/inputs/constants';
import { useKibana } from '../../common/lib/kibana';

const StyledFullHeightContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

const EntityAnalyticsPageNewComponent = () => {
  const { indicesExist, loading: isSourcererLoading, indexPattern } = useSourcererDataView();
  const {
    data: {
      query: {
        timefilter: { timefilter },
        filterManager,
      },
    },
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  console.log('query', query);
  console.log('filters', filters);
  const data = [
    {
      '@timestamp': 1,
      identifierField: 'host.name',
      identifierValue: 'host-1',
      identityType: 'host',
      calculatedLevel: 'High',
      calculatedScore: 60,
      calculatedScoreNorm: 61,
    },
    {
      '@timestamp': 1,
      identifierField: 'host.name',
      identifierValue: 'host-2',
      identityType: 'host',
      calculatedLevel: 'Low',
      calculatedScore: 30,
      calculatedScoreNorm: 31,
    },
    {
      '@timestamp': 1,
      identifierField: 'user.name',
      identifierValue: 'user-2',
      identityType: 'user',
      calculatedLevel: 'Low',
      calculatedScore: 30,
      calculatedScoreNorm: 31,
    },
    {
      '@timestamp': 1,
      identifierField: 'user.name',
      identifierValue: 'user-3',
      identityType  : 'user',
      calculatedLevel: 'Low',
      calculatedScore: 30,
      calculatedScoreNorm: 31,
    },
  ];

  const columns = [
    {
      field: 'identifierValue',
      name: 'Name',
    },
    {
      field: 'identifierField',
      name: 'Field',
    },
    {
      field: 'calculatedScore',
      name: 'Score',
    },
    {
      field: 'calculatedScoreNorm',
      name: 'Score norm',
    },
    ,
    {
      field: 'calculatedLevel',
      name: 'Level',
      render: (risk) => {
        if (risk != null) {
          return <RiskScore severity={risk} />;
        }
      },
    },
  ];

  const hostRiskData = data.filter(item => item.identityType === 'host');
  const userRiskData = data.filter(item => item.identityType === 'user');

  return (
    <StyledFullHeightContainer>
      <FiltersGlobal>
        <SiemSearchBar id={InputsModelId.global} indexPattern={indexPattern} />
      </FiltersGlobal>
      <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsPage">
        <HeaderPage title={ENTITY_ANALYTICS} />
        <EuiFlexGroup direction="column" data-test-subj="entityAnalyticsSections">
          <EuiFlexItem>
            <InspectButtonContainer>
              <Panel hasBorder>
                <HeaderSection title="Host risk" />

                <EuiFlexGroup data-test-subj="entity_analytics_content">
                  <EuiFlexItem grow={false}>
                    <StyledBasicTable
                      responsive={false}
                      items={hostRiskData}
                      columns={columns}
                      loading={false}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </Panel>
            </InspectButtonContainer>
          </EuiFlexItem>
          <EuiFlexItem>
            <InspectButtonContainer>
              <Panel hasBorder>
                <HeaderSection title="User risk" />

                <EuiFlexGroup data-test-subj="entity_analytics_content">
                  <EuiFlexItem grow={false}>
                    <StyledBasicTable
                      responsive={false}
                      items={userRiskData}
                      columns={columns}
                      loading={false}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </Panel>
            </InspectButtonContainer>
          </EuiFlexItem>
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>
    </StyledFullHeightContainer>
  );
};

export const EntityAnalyticsPageNew = React.memo(EntityAnalyticsPageNewComponent);
