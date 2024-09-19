/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { Dispatch, SetStateAction, useCallback } from 'react';
import styled from 'styled-components';
import { isEmpty } from 'lodash';
import { TypedLensByValueInput } from '../../../../../lens/public';
import { useSeriesStorage } from './hooks/use_series_storage';
import { ObservabilityPublicPluginsStart } from '../../../plugin';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ReportViewType, SeriesUrl } from './types';
import { ReportTypes } from './configurations/constants';

interface Props {
  lensAttributes: TypedLensByValueInput['attributes'];
  setLastUpdated: Dispatch<SetStateAction<number | undefined>>;
}
export const combineTimeRanges = (
  reportType: ReportViewType,
  allSeries: SeriesUrl[],
  firstSeries?: SeriesUrl
) => {
  let to: string = '';
  let from: string = '';

  if (reportType === ReportTypes.KPI) {
    return firstSeries?.time;
  }

  allSeries.forEach((series) => {
    if (
      series.dataType &&
      series.selectedMetricField &&
      !isEmpty(series.reportDefinitions) &&
      series.time
    ) {
      const seriesTo = new Date(series.time.to);
      const seriesFrom = new Date(series.time.from);
      if (!to || seriesTo > new Date(to)) {
        to = series.time.to;
      }
      if (!from || seriesFrom < new Date(from)) {
        from = series.time.from;
      }
    }
  });

  return { to, from };
};

export function LensEmbeddable(props: Props) {
  const { lensAttributes, setLastUpdated } = props;

  const {
    services: { lens, notifications },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const LensComponent = lens?.EmbeddableComponent;

  const { firstSeries, setSeries, allSeries, reportType } = useSeriesStorage();

  const firstSeriesId = 0;

  const timeRange = firstSeries ? combineTimeRanges(reportType, allSeries, firstSeries) : null;

  const onLensLoad = useCallback(() => {
    setLastUpdated(Date.now());
  }, [setLastUpdated]);

  const onBrushEnd = useCallback(
    ({ range }: { range: number[] }) => {
      if (reportType !== 'data-distribution' && firstSeries) {
        setSeries(firstSeriesId, {
          ...firstSeries,
          time: {
            from: new Date(range[0]).toISOString(),
            to: new Date(range[1]).toISOString(),
          },
        });
      } else {
        notifications?.toasts.add(
          i18n.translate('xpack.observability.exploratoryView.noBrusing', {
            defaultMessage: 'Zoom by brush selection is only available on time series charts.',
          })
        );
      }
    },
    [reportType, setSeries, firstSeries, notifications?.toasts]
  );

  if (timeRange === null || !firstSeries) {
    return null;
  }

  return (
    <LensWrapper>
      <LensComponent
        id="exploratoryView"
        timeRange={timeRange}
        attributes={lensAttributes}
        onLoad={onLensLoad}
        onBrushEnd={onBrushEnd}
      />
    </LensWrapper>
  );
}

const LensWrapper = styled.div`
  height: 100%;

  &&& > div {
    height: 100%;
  }
`;
