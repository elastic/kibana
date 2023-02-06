/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useCallback } from 'react';
import {
  EuiBadge,
  EuiCallOut,
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
import { SPLIT_FIELD_CARDINALITY_LIMIT } from './constants';
import { ChangePointTypeFilter } from './change_point_type_filter';
import { SearchBarWrapper } from './search_bar';
import { ChangePointType, useChangePointDetectionContext } from './change_point_detection_context';
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
    splitFieldCardinality,
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
    (changePointType: ChangePointType[] | undefined) => {
      updateRequestParams({ changePointType });
    },
    [updateRequestParams]
  );

  const selectControlCss = { width: '300px' };

  const cardinalityExceeded =
    splitFieldCardinality && splitFieldCardinality > SPLIT_FIELD_CARDINALITY_LIMIT;

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

      {cardinalityExceeded ? (
        <>
          <EuiCallOut
            title={i18n.translate('xpack.aiops.changePointDetection.cardinalityWarningTitle', {
              defaultMessage: 'Analysis has been limited',
            })}
            color="warning"
            iconType="alert"
          >
            <p>
              {i18n.translate('xpack.aiops.changePointDetection.cardinalityWarningMessage', {
                defaultMessage:
                  'The "{splitField}" field cardinality is {cardinality} which exceeds the limit of {cardinalityLimit}. Only the first {cardinalityLimit} partitions are analyzed.',
                values: {
                  cardinality: splitFieldCardinality,
                  cardinalityLimit: SPLIT_FIELD_CARDINALITY_LIMIT,
                  splitField: requestParams.splitField,
                },
              })}
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      ) : null}

      <EuiFlexGroup alignItems={'center'} justifyContent={'spaceBetween'}>
        <EuiFlexItem grow={false}>
          <EuiText size={'s'}>
            <FormattedMessage
              id="xpack.aiops.changePointDetection.aggregationIntervalTitle"
              defaultMessage="Aggregation interval: "
            />
            {requestParams.interval}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ minWidth: '400px' }}>
          <ChangePointTypeFilter
            value={requestParams.changePointType}
            onChange={setChangePointType}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

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
                  defaultMessage="Detect statistically significant change points such as dips, spikes, and distribution changes in a metric. Select a metric and set a time range to start detecting change points in your data"
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
