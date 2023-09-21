/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { EuiIcon, EuiText, EuiLoadingSpinner } from '@elastic/eui';
import { Chart, Metric, MetricTrendShape, Settings } from '@elastic/charts';
import numeral from '@elastic/numeral';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { ALL_VALUE } from '@kbn/slo-schema';
import { NOT_AVAILABLE_LABEL } from '../../../common/i18n';
import { useKibana } from '../../utils/kibana_react';
import { useFetchSloDetails } from '../../hooks/slo/use_fetch_slo_details';
import { paths } from '../../../common/locators/paths';

import { EmbeddableSloProps } from './types';

export function SloOverview({ sloId, sloInstanceId, startTime, endTime }: EmbeddableSloProps) {
  const {
    uiSettings,
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;
  const { isLoading, slo, refetch, isRefetching } = useFetchSloDetails({
    sloId,
    instanceId: sloInstanceId,
    shouldRefetch: true,
  });

  useEffect(() => {
    refetch();
  }, [startTime, endTime, refetch]);

  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const isSloNotFound = !isLoading && slo === undefined;

  const getIcon = useCallback(
    (type: string) =>
      ({ width = 20, height = 20, color }: { width: number; height: number; color: string }) => {
        return <EuiIcon type={type} width={width} height={height} fill={color} />;
      },
    []
  );

  if (isRefetching) {
    return (
      <LoadingPanel>
        <LoadingContentPanel>
          <EuiLoadingSpinner size="m" />
          <EuiText>
            <p>reloading</p>
          </EuiText>
        </LoadingContentPanel>
      </LoadingPanel>
    );
  }
  if (isSloNotFound) {
    return null;
  }

  const color =
    slo?.summary.status === 'NO_DATA'
      ? '#f8e9e9'
      : slo?.summary.status !== 'HEALTHY'
      ? '#f8e9e9'
      : '#e6f9f7';

  const extraContent = `Target <b>${numeral(slo?.objective.target).format(percentFormat)}</b>`;
  // eslint-disable-next-line react/no-danger
  const extra = <span dangerouslySetInnerHTML={{ __html: extraContent }} />;
  const metricData =
    slo !== undefined
      ? [
          {
            color,
            title: slo.name,
            subtitle: slo.groupBy !== '*' ? `${slo.groupBy}:${slo.instanceId}` : '',
            icon: getIcon('visGauge'),
            value:
              slo.summary.status === 'NO_DATA'
                ? NOT_AVAILABLE_LABEL
                : numeral(Number.parseFloat(slo.summary.sliValue.toString())).format(percentFormat),
            valueFormatter: (value: number) => `${value}%`,
            extra,
            trend: [],
            trendShape: MetricTrendShape.Area,
          },
        ]
      : [];
  return (
    <>
      <Chart>
        <Settings
          onElementClick={([d]) => {
            navigateToUrl(
              basePath.prepend(
                paths.observability.sloDetails(
                  slo?.id,
                  slo?.groupBy !== ALL_VALUE && slo?.instanceId ? slo.instanceId : undefined
                )
              )
            );
          }}
        />
        <Metric id="1" data={[metricData]} />
      </Chart>
    </>
  );
}

export const LoadingPanel = euiStyled.div`
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  height: 100%;
`;

export const LoadingContentPanel = euiStyled.div`
  flex: 0 0 auto;
  align-self: center;
  text-align: center;
`;
