/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useCallback } from 'react';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPagination,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Query } from '@kbn/es-query';
import { ChangePointTypeFilter, type ChangePointUIValue } from './change_point_type_filter';
import { SearchBarWrapper } from './search_bar';
import { useChangePointDetectionContext } from './change_point_detection_context';
import { MetricFieldSelector } from './metric_field_selector';
import { SplitFieldSelector } from './split_field_selector';
import { FunctionPicker } from './function_picker';
import { ChartComponent } from './chart_component';

export const ChangePointDetectionPage: FC = () => {
  const {
    requestParams,
    updateRequestParams,
    annotations,
    resultFilters,
    updateFilters,
    resultQuery,
    progress,
    pagination,
  } = useChangePointDetectionContext();

  const setFn = useCallback(
    (fn: string) => {
      updateRequestParams({ fn });
    },
    [updateRequestParams]
  );

  const setSplitField = useCallback(
    (splitField: string) => {
      updateRequestParams({ splitField });
    },
    [updateRequestParams]
  );

  const setMetricField = useCallback(
    (metricField: string) => {
      updateRequestParams({ metricField });
    },
    [updateRequestParams]
  );

  const setQuery = useCallback(
    (query: Query) => {
      updateRequestParams({ query });
    },
    [updateRequestParams]
  );

  const setChangePointType = useCallback(
    (changePointType: ChangePointUIValue) => {
      updateRequestParams({ changePointType });
    },
    [updateRequestParams]
  );

  const selectControlCss = { width: '300px' };

  return (
    <div data-test-subj="aiopsChangePointDetectionPage">
      <SearchBarWrapper
        query={resultQuery}
        onQueryChange={setQuery}
        filters={resultFilters}
        onFiltersChange={updateFilters}
      />

      <EuiSpacer size="m" />

      <EuiFlexGroup alignItems={'center'}>
        <EuiFlexItem grow={false} css={selectControlCss}>
          <FunctionPicker value={requestParams.fn} onChange={setFn} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={selectControlCss}>
          <MetricFieldSelector value={requestParams.metricField} onChange={setMetricField} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={selectControlCss}>
          <SplitFieldSelector value={requestParams.splitField} onChange={setSplitField} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={selectControlCss}>
          <ChangePointTypeFilter
            value={requestParams.changePointType}
            onChange={setChangePointType}
          />
        </EuiFlexItem>

        <EuiFlexItem css={{ visibility: progress === 100 ? 'hidden' : 'visible' }} grow={false}>
          <EuiProgress
            label={
              <FormattedMessage
                id="xpack.aiops.changePointDetection.progressBarLabel"
                defaultMessage="Fetching change points"
              />
            }
            value={progress}
            max={100}
            valueText
            size="m"
          />
          <EuiSpacer size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiText size={'s'}>
        <FormattedMessage
          id="xpack.aiops.changePointDetection.aggregationIntervalTitle"
          defaultMessage="Aggregation interval: "
        />
        {requestParams.interval}
      </EuiText>
      <EuiSpacer size="xs" />

      {annotations.length === 0 && progress === 100 ? (
        <>
          <EuiEmptyPrompt
            iconType="search"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.aiops.changePointDetection.noChangePointsFoundTitle"
                  defaultMessage="No change points found"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.aiops.changePointDetection.noChangePointsFoundMessage"
                  defaultMessage="Try to extend the time range or update the query"
                />
              </p>
            }
          />
        </>
      ) : null}

      <EuiFlexGrid columns={annotations.length >= 2 ? 2 : 1} responsive gutterSize={'m'}>
        {annotations.map((v) => {
          return (
            <EuiFlexItem key={v.group.value}>
              <EuiPanel paddingSize="s" hasBorder hasShadow={false}>
                <EuiFlexGroup justifyContent={'spaceBetween'} alignItems={'center'}>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup alignItems={'center'} gutterSize={'s'}>
                      <EuiFlexItem grow={false}>
                        <EuiDescriptionList
                          type="inline"
                          listItems={[{ title: v.group.name, description: v.group.value }]}
                        />
                      </EuiFlexItem>
                      {v.reason ? (
                        <EuiFlexItem grow={false}>
                          <EuiToolTip position="top" content={v.reason}>
                            <EuiIcon
                              tabIndex={0}
                              color={'warning'}
                              type="alert"
                              title={i18n.translate(
                                'xpack.aiops.changePointDetection.notResultsWarning',
                                {
                                  defaultMessage: 'No change point agg results warning',
                                }
                              )}
                            />
                          </EuiToolTip>
                        </EuiFlexItem>
                      ) : null}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiHorizontalRule margin="xs" />

                <EuiFlexGroup justifyContent={'spaceBetween'} alignItems={'center'}>
                  {v.p_value !== undefined ? (
                    <EuiFlexItem grow={false}>
                      <EuiDescriptionList
                        type="inline"
                        listItems={[{ title: 'p-value', description: v.p_value.toPrecision(3) }]}
                      />
                    </EuiFlexItem>
                  ) : null}
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">{v.type}</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <ChartComponent annotation={v} />
              </EuiPanel>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGrid>

      <EuiSpacer size="m" />

      {pagination.pageCount > 1 ? (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiPagination
              pageCount={pagination.pageCount}
              activePage={pagination.activePage}
              onPageClick={pagination.updatePagination}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
    </div>
  );
};
