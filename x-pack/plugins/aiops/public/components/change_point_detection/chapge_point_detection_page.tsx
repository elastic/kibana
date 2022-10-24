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
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { useChangePontDetectionContext } from './change_point_detection_context';
import { MetricFieldSelector } from './metric_field_selector';
import { SplitFieldSelector } from './split_field_selector';
import { FunctionPicker } from './function_picker';
import { PageHeader } from '../page_header';
import { ChartComponent } from './chart_component';

export const ChangePointDetectionPage: FC = () => {
  const { isLoading, requestParams, updateRequestParams, annotations } =
    useChangePontDetectionContext();

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

  return (
    <div data-test-subj="aiopsChanePointDetectionPage">
      <PageHeader />
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

      {isLoading ? (
        <EuiProgress size="xs" color="accent" />
      ) : (
        <EuiHorizontalRule size="full" margin="s" />
      )}

      <EuiFlexGrid columns={2} responsive gutterSize={'s'}>
        {annotations.map((v) => {
          return (
            <EuiFlexItem key={v.group_field}>
              <EuiPanel paddingSize="s" hasBorder hasShadow={false}>
                <EuiTitle size="xxs">
                  <h3>{v.group_field}</h3>
                </EuiTitle>
                <EuiBadge color="hollow">{v.type}</EuiBadge>

                {v.p_value ? (
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
