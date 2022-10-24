/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useCallback, useState } from 'react';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useChangePontDetectionContext } from './change_point_detection_context';
import { MetricFieldSelector } from './metric_field_selector';
import { useChangePointRequest } from './use_change_point_agg_request';
import { SplitFieldSelector } from './split_field_selector';
import { FunctionPicker } from './function_picker';
import { usePageUrlState } from '../../hooks/use_url_state';
import { PageHeader } from '../page_header';
import { ChartComponent, ChartComponentProps } from './chart_component';

export interface ChangePointDetectionUrlState {
  fn: string;
  splitField: string;
  metricField: string;
}

export const ChangePointDetectionPage: FC = () => {
  const { timeBuckets } = useChangePontDetectionContext();

  const [urlState, updateUrlState] = usePageUrlState<ChangePointDetectionUrlState>('changePoint');
  const [annotation, setAnnotation] = useState<ChartComponentProps['annotation']>();

  const setFn = useCallback(
    (fn: string) => {
      updateUrlState({ fn });
    },
    [updateUrlState]
  );

  const setSplitField = useCallback(
    (splitField: string) => {
      updateUrlState({ splitField });
    },
    [updateUrlState]
  );

  const setMetricField = useCallback(
    (metricField: string) => {
      updateUrlState({ metricField });
    },
    [updateUrlState]
  );

  const { runRequest, isLoading } = useChangePointRequest();

  const fetchStuff = useCallback(async () => {
    const result = await runRequest();
    console.log(result, '___result___');

    const timeAsString = result.rawResponse.aggregations.change_point_request.bucket.key;
    setAnnotation({
      timestamp: timeAsString,
      endTimestamp: moment(timeAsString).add(timeBuckets.getInterval()).toISOString(),
      label: Object.keys(result.rawResponse.aggregations.change_point_request.type)[0] as string,
    });
  }, [runRequest, timeBuckets]);

  return (
    <div data-test-subj="aiopsChanePointDetectionPage">
      <PageHeader />
      <EuiFlexGroup alignItems={'center'}>
        <EuiFlexItem grow={false}>
          <FunctionPicker value={urlState.fn} onChange={setFn} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MetricFieldSelector value={urlState.metricField} onChange={setMetricField} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SplitFieldSelector value={urlState.splitField} onChange={setSplitField} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ marginLeft: 'auto' }}>
          <EuiButton fill onClick={fetchStuff} isLoading={isLoading}>
            <FormattedMessage
              id="xpack.aiops.changePointDetection.runRequestButton"
              defaultMessage="Run"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <ChartComponent annotation={annotation} />
    </div>
  );
};
