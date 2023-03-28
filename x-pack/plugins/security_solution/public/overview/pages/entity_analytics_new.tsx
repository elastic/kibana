/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiSwitch,
  EuiButtonEmpty,
  EuiInMemoryTable,
  EuiFieldNumber,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
  EuiCallOut,
} from '@elastic/eui';
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
import { InputsModelId } from '../../common/store/inputs/constants';
import { useKibana } from '../../common/lib/kibana';
import { RISK_SCORES_URL } from '../../../common/constants';

import { AlertsTableComponent } from '../../detections/components/alerts_table';
import { ModalInspectQuery } from '../../common/components/inspect/modal';

const StyledFullHeightContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

const EntityAnalyticsPageNewComponent = () => {
  const { indicesExist, loading: isSourcererLoading, indexPattern } = useSourcererDataView();
  const [categories, setCategories] = useState([
    {
      type: 'global',
      weights: {
        host: 1,
        user: 1,
      },
    },
  ]);
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
          {row.notes.map((note) => (
            <div>
              <EuiCallOut>{note}</EuiCallOut>
              <EuiSpacer size="m" />
            </div>
          ))}
          <AlertsTableComponent
            configId={`securitySolution-riskScores`}
            globalQuery={query}
            loadingEventIds={[]}
            globalFilters={filters}
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
            from={range.from}
            to={range.to}
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
      const threatWeights = categories[0].weights;
      const data = await http.fetch(RISK_SCORES_URL, {
        method: 'POST',
        body: JSON.stringify({
          debug: withDebug,
          filter: q,
          range: {
            start: range.from,
            end: range.to,
          },
          weights: [
            {
              ...categories[0].weights,
              type: categories[0].type,
            },
          ],
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

      console.log('data', data);
    };

    try {
      fetchData();
    } catch (error) {
      console.error('error', error);
    }
  }, [range, filters, query, withDebug, categories]);

  // console.log('query', query);
  // console.log('filters', filters);
  // console.log('range', range);
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
      sortable: true,
    },
    {
      field: 'identifierField',
      name: 'Field',
      sortable: true,
    },
    {
      field: 'calculatedScore',
      align: 'right',
      name: 'Score',
      sortable: true,
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
      sortable: true,
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
      sortable: true,
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

  const search = {
    box: {
      incremental: true,
    },
    filters: [
      {
        type: 'field_value_selection',
        field: 'calculatedLevel',
        name: 'Level',
        multiSelect: false,
        options: [
          { value: 'Unknown' },
          { value: 'Low' },
          { value: 'Moderate' },
          { value: 'High' },
          { value: 'Critical' },
        ],
      },
    ],
  };

  const writeInNewPage = (info) => {
    const tab = window.open('about:blank', '_blank');
    tab?.document?.write(`
      <html>
        <body>
          <pre>${JSON.stringify(info, null, 2)}<pre>
        </body>
      </html>
    `);
    tab?.document?.close();
  };

  const updateCategoryWeight = (weights, index) => {
    const newCategories = categories.map((category, i) => {
      if (i === index) {
        return {
          ...category,
          weights: {
            ...category.weights,
            ...weights,
          },
        };
      } else {
        return category;
      }
    });

    setCategories(newCategories);
  };

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
                <>
                  <EuiButtonEmpty
                    onClick={(e) => {
                      writeInNewPage(debugInfo?.request);
                    }}
                  >
                    Show Request
                  </EuiButtonEmpty>
                  <EuiButtonEmpty
                    onClick={(e) => {
                      writeInNewPage(debugInfo?.response);
                    }}
                  >
                    Show Response
                  </EuiButtonEmpty>
                </>
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
            <EuiSpacer size="l" />
            <EuiTitle size="s">
              <h2>Weights</h2>
            </EuiTitle>
            <EuiSpacer size="l" />
            <div>
              {categories.map((category, index) => (
                <div>
                  <EuiTitle size="xs">
                    <h3>{category.type}</h3>
                  </EuiTitle>
                  <EuiSpacer size="xs" />
                  <EuiFlexGroup style={{ maxWidth: 600 }}>
                    <EuiFlexItem>
                      <EuiFormRow label="Host weight">
                        <EuiFieldNumber
                          placeholder="Host weight"
                          value={category.weights.host}
                          step={'0.1'}
                          min={0}
                          max={1}
                          onChange={(e) =>
                            updateCategoryWeight(
                              {
                                host: Number(e.target.value),
                              },
                              index
                            )
                          }
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFormRow label="User weight">
                        <EuiFieldNumber
                          placeholder="User weight"
                          value={category.weights.user}
                          step={'0.1'}
                          min={0}
                          max={1}
                          onChange={(e) =>
                            updateCategoryWeight(
                              {
                                user: Number(e.target.value),
                              },
                              index
                            )
                          }
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </div>
              ))}
            </div>
          </div>
          <EuiFlexItem>
            <InspectButtonContainer>
              <Panel hasBorder>
                <HeaderSection title="Host risk" />

                <EuiFlexGroup data-test-subj="entity_analytics_content">
                  <EuiFlexItem grow={false}>
                    <EuiInMemoryTable
                      responsive={false}
                      items={hostRiskList}
                      columns={columns}
                      loading={false}
                      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
                      isExpandable={true}
                      itemId="identifierValue"
                      pagination={true}
                      sorting={{
                        sort: {
                          field: 'calculatedScoreNorm',
                          direction: 'desc' as const,
                        },
                      }}
                      search={search}
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
                    <EuiInMemoryTable
                      responsive={false}
                      items={userRiskList}
                      columns={columns}
                      loading={false}
                      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
                      isExpandable={true}
                      itemId="identifierValue"
                      pagination={true}
                      sorting={{
                        sort: {
                          field: 'calculatedScoreNorm',
                          direction: 'desc' as const,
                        },
                      }}
                      search={search}
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
