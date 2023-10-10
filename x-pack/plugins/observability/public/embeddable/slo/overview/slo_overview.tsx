/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon, useEuiBackgroundColor } from '@elastic/eui';
import { Chart, Metric, MetricTrendShape, Settings } from '@elastic/charts';
import numeral from '@elastic/numeral';
import { ALL_VALUE } from '@kbn/slo-schema';
import { EuiLoadingChart } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { useKibana } from '../../../utils/kibana_react';
import { useFetchSloDetails } from '../../../hooks/slo/use_fetch_slo_details';
import { paths } from '../../../../common/locators/paths';

import { EmbeddableSloProps } from './types';

export function SloOverview({ sloId, sloInstanceId, lastReloadRequestTime }: EmbeddableSloProps) {
  const {
    uiSettings,
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;
  const { isLoading, slo, refetch, isRefetching } = useFetchSloDetails({
    sloId,
    instanceId: sloInstanceId,
  });

  useEffect(() => {
    refetch();
  }, [lastReloadRequestTime, refetch]);

  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const isSloNotFound = !isLoading && slo === undefined;

  const getIcon = useCallback(
    (type: string) =>
      ({ width = 20, height = 20, color }: { width: number; height: number; color: string }) => {
        return <EuiIcon type={type} width={width} height={height} fill={color} />;
      },
    []
  );

  const sloSummary = slo?.summary;
  const sloStatus = sloSummary?.status;
  const healthyColor = useEuiBackgroundColor('success');
  const noDataColor = useEuiBackgroundColor('subdued');
  const degradingColor = useEuiBackgroundColor('warning');
  const violatedColor = useEuiBackgroundColor('danger');
  let color;
  switch (sloStatus) {
    case 'HEALTHY':
      color = healthyColor;
      break;
    case 'NO_DATA':
      color = noDataColor;
      break;
    case 'DEGRADING':
      color = degradingColor;
      break;
    case 'VIOLATED':
      color = violatedColor;
      break;
    default:
      color = noDataColor;
  }

  if (isRefetching || isLoading) {
    return (
      <LoadingContainer>
        <LoadingContent>
          <EuiLoadingChart />
        </LoadingContent>
      </LoadingContainer>
    );
  }

  if (isSloNotFound) {
    return (
      <LoadingContainer>
        <LoadingContent>
          {i18n.translate('xpack.observability.sloEmbeddable.overview.sloNotFoundText', {
            defaultMessage:
              'The SLO has been deleted. You can safely delete the widget from the dashboard.',
          })}
        </LoadingContent>
      </LoadingContainer>
    );
  }
  const TargetCopy = i18n.translate('xpack.observability.sloEmbeddable.overview.sloTargetLabel', {
    defaultMessage: 'Target',
  });
  const extraContent = `${TargetCopy} <b>${numeral(slo?.objective.target).format(
    percentFormat
  )}</b>`;
  // eslint-disable-next-line react/no-danger
  const extra = <span dangerouslySetInnerHTML={{ __html: extraContent }} />;
  const metricData =
    slo !== undefined
      ? [
          {
            color,
            title: slo.name,
            subtitle: slo.groupBy !== ALL_VALUE ? `${slo.groupBy}:${slo.instanceId}` : '',
            icon: getIcon('visGauge'),
            value:
              sloStatus === 'NO_DATA'
                ? NOT_AVAILABLE_LABEL
                : numeral(slo.summary.sliValue).format(percentFormat),
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
          onElementClick={() => {
            navigateToUrl(
              basePath.prepend(
                paths.observability.sloDetails(
                  slo!.id,
                  slo?.groupBy !== ALL_VALUE && slo?.instanceId ? slo.instanceId : undefined
                )
              )
            );
          }}
          locale={i18n.getLocale()}
        />
        <Metric id={`${slo?.id}-${slo?.instanceId}`} data={[metricData]} />
      </Chart>
    </>
  );
}

export const LoadingContainer = euiStyled.div`
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  height: 100%;
`;

export const LoadingContent = euiStyled.div`
  flex: 0 0 auto;
  align-self: center;
  text-align: center;
`;
