/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useEffect, useState } from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiSwitch, EuiButtonEmpty } from '@elastic/eui';
import { buildEsQuery } from '@kbn/es-query';
import { Panel } from '../../common/components/panel';
import { ENTITY_ANALYTICS } from '../../app/translations';
import { HeaderSection } from '../../common/components/header_section';
import { InspectButtonContainer } from '../../common/components/inspect';
import { inputsSelectors } from '../../common/store/inputs';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { SiemSearchBar } from '../../common/components/search_bar';
import { FiltersGlobal } from '../../common/components/filters_global';
import { RiskScore } from '../../explore/components/risk_score/severity/common';
import { StyledBasicTable } from '../components/entity_analytics/common/styled_basic_table';
import { InputsModelId } from '../../common/store/inputs/constants';
import { useKibana } from '../../common/lib/kibana';
import { RISK_SCORES_URL, ALERTS_TABLE_REGISTRY_CONFIG_IDS } from '../../../common/constants';

import { AlertsTableComponent } from '../../detections/components/alerts_table';
import { ModalInspectQuery } from '../../common/components/inspect/modal';

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
    http,
  } = useKibana().services;

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState({});

  const toggleReasons = (row) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

    if (itemIdToExpandedRowMapValues[row.identifierValue]) {
      delete itemIdToExpandedRowMapValues[row.identifierValue];
    } else {
      itemIdToExpandedRowMapValues[row.identifierValue] = (
        <div style={{ width: '100%' }}>
          <AlertsTableComponent
            configId={ALERTS_TABLE_REGISTRY_CONFIG_IDS.CASE}
            inputFilters={[
              {
                meta: {
                  alias: null,
                  negate: false,
                  disabled: false,
                },
                query: {
                  terms: {
                    _id: row?.riskiestInputs?.map((item) => item._id),
                  },
                },
              },
            ]}
            tableId={row.identifierValue}
            // onRuleChange={refreshRule}
          />
        </div>
      );
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );

  const [hostRiskList, setHostRiskList] = useState([]);
  const [userRiskList, setUserRiskList] = useState([]);
  const [debugInfo, setDebugInfo] = useState(null);
  const [withDebug, setWithDebug] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);
  const range = useDeepEqualSelector(inputsSelectors.globalTimeRangeSelector);

  useEffect(() => {
    const fetchData = async () => {
      const q = buildEsQuery(undefined, query, filters);
      const data = await http.fetch(RISK_SCORES_URL, {
        method: 'POST',
        body: JSON.stringify({
          debug: withDebug,
          filter: q,
          range: {
            start: range.from,
            end: range.to,
          },
        }),
      });
      setHostRiskList(data.scores.filter((item) => item.identifierField === 'host.name'));
      setUserRiskList(data.scores.filter((item) => item.identifierField === 'user.name'));
      setDebugInfo(
        data.request
          ? {
              request: { body: data.request, index: [data.request.index] },
              response: data.response,
            }
          : null
      );

      console.log(data);
    };

    try {
      fetchData();
    } catch (error) {
      console.log('error', error);
    }
  }, [range, filters, query, withDebug]);

  console.log('query', query);
  console.log('filters', filters);
  console.log('range', range);
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
      identityType: 'user',
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
      align: 'right',
      name: 'Score',
      render: (score) => {
        if (score != null) {
          return Math.round(score * 100) / 100;
        }
        return '';
      },
    },
    {
      field: 'calculatedScoreNorm',
      align: 'right',
      name: 'Score norm',
      render: (scoreNorm) => {
        if (scoreNorm != null) {
          return Math.round(scoreNorm * 100) / 100;
        }
        return '';
      },
    },
    {
      field: 'calculatedLevel',
      name: 'Level',
      render: (risk) => {
        if (risk != null) {
          return <RiskScore severity={risk} />;
        }
      },
    },
    {
      align: 'right',
      width: '100px',
      isExpander: true,
      name: 'Reasons',
      render: (row) => {
        const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

        return (
          <>
            {row?.riskiestInputs?.length}
            <EuiButtonIcon
              onClick={() => toggleReasons(row)}
              aria-label={itemIdToExpandedRowMapValues[row.identifierValue] ? 'Collapse' : 'Expand'}
              iconType={
                itemIdToExpandedRowMapValues[row.identifierValue] ? 'arrowDown' : 'arrowRight'
              }
            />
          </>
        );
      },
    },
  ];

  const firstHostRisk = hostRiskList[0];

  return (
    <StyledFullHeightContainer>
      <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsPage">
        <FiltersGlobal>
          <SiemSearchBar id={InputsModelId.global} indexPattern={indexPattern} />
        </FiltersGlobal>
        <HeaderPage title={ENTITY_ANALYTICS} />
        <EuiFlexGroup direction="column" data-test-subj="entityAnalyticsSections">
          <div>
            <EuiSwitch
              checked={withDebug}
              onChange={(e) => setWithDebug(e.target.checked)}
              label="With Debug info"
            />

            <div>
              {withDebug && (
                <EuiButtonEmpty onClick={(e) => setShowModal(true)}>Show Debug Info</EuiButtonEmpty>
              )}
              {showModal && (
                <ModalInspectQuery
                  closeModal={() => setShowModal(false)}
                  data-test-subj="inspect-modal"
                  // inputId={inputId}
                  request={JSON.stringify(debugInfo?.request)}
                  response={JSON.stringify(debugInfo?.response)}
                  title={'Inspect query'}
                />
              )}
            </div>
          </div>
          <EuiFlexItem>
            <InspectButtonContainer>
              <Panel hasBorder>
                <HeaderSection title="Host risk" />

                <EuiFlexGroup data-test-subj="entity_analytics_content">
                  <EuiFlexItem grow={false}>
                    <StyledBasicTable
                      responsive={false}
                      items={hostRiskList}
                      columns={columns}
                      loading={false}
                      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
                      isExpandable={true}
                      itemId="identifierValue"
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
                      items={userRiskList}
                      columns={columns}
                      loading={false}
                      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
                      isExpandable={true}
                      itemId="identifierValue"
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
