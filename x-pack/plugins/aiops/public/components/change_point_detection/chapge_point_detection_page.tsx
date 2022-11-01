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
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Query } from '@kbn/es-query';
import { css } from '@emotion/react';
import { SearchBarWrapper } from './search_bar';
import { useChangePontDetectionContext } from './change_point_detection_context';
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
  } = useChangePontDetectionContext();

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

  return (
    <div data-test-subj="aiopsChanePointDetectionPage">
      <SearchBarWrapper
        query={resultQuery}
        onQueryChange={setQuery}
        filters={resultFilters}
        onFiltersChange={updateFilters}
      />

      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems={'center'}>
        <EuiFlexItem grow={false}>
          <FunctionPicker value={requestParams.fn} onChange={setFn} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MetricFieldSelector value={requestParams.metricField} onChange={setMetricField} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SplitFieldSelector value={requestParams.splitField} onChange={setSplitField} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <div
        css={css`
          visibility: ${progress === 100 ? 'hidden' : 'visible'};
        `}
      >
        <EuiProgress
          label={
            <FormattedMessage
              id="xpack.aiops.changePointDetection.progressBarLabel"
              defaultMessage="Fetching stuff"
            />
          }
          value={progress}
          max={100}
          valueText
          size="m"
        />
        <EuiSpacer size="m" />
      </div>

      {annotations.length === 0 ? (
        <EuiCallOut
          size="s"
          title={
            <FormattedMessage
              id="xpack.aiops.changePointDetection.noChangePointsFoundTitle"
              defaultMessage="No change points found"
            />
          }
          iconType="search"
        >
          <p>
            <FormattedMessage
              id="xpack.aiops.changePointDetection.noChangePointsFoundMessage"
              defaultMessage="Try to extend the time range or update the query"
            />
          </p>
        </EuiCallOut>
      ) : null}

      <EuiFlexGrid columns={annotations.length >= 2 ? 2 : 1} responsive gutterSize={'s'}>
        {annotations.map((v) => {
          return (
            <EuiFlexItem key={v.group_field}>
              <EuiPanel paddingSize="s" hasBorder hasShadow={false}>
                <EuiFlexGroup justifyContent={'spaceBetween'} alignItems={'center'}>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup alignItems={'center'} gutterSize={'s'}>
                      <EuiFlexItem grow={false}>
                        <EuiTitle size="xxs">
                          <h3>{v.group_field}</h3>
                        </EuiTitle>
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
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">{v.type}</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>

                {v.p_value !== undefined ? (
                  <EuiDescriptionList
                    type="inline"
                    listItems={[{ title: 'p_value', description: v.p_value }]}
                  />
                ) : null}
                <ChartComponent annotation={v} />
              </EuiPanel>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGrid>
    </div>
  );
};
