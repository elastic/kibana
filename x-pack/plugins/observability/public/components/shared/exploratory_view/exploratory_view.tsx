/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EuiPanel, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { isEmpty } from 'lodash';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityPublicPluginsStart } from '../../../plugin';
import { ExploratoryViewHeader } from './header/header';
import { useSeriesStorage } from './hooks/use_series_storage';
import { useLensAttributes } from './hooks/use_lens_attributes';
import { EmptyView } from './components/empty_view';
import { TypedLensByValueInput } from '../../../../../lens/public';
import { useAppIndexPatternContext } from './hooks/use_app_index_pattern';
import { SeriesBuilder } from './series_builder/series_builder';
import { SeriesUrl } from './types';

export const combineTimeRanges = (
  allSeries: Record<string, SeriesUrl>,
  firstSeries?: SeriesUrl
) => {
  let to: string = '';
  let from: string = '';
  if (firstSeries?.reportType === 'kpi-over-time') {
    return firstSeries.time;
  }
  Object.values(allSeries ?? {}).forEach((series) => {
    if (series.dataType && series.reportType && !isEmpty(series.reportDefinitions)) {
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

export function ExploratoryView({
  saveAttributes,
  multiSeries,
}: {
  multiSeries?: boolean;
  saveAttributes?: (attr: TypedLensByValueInput['attributes'] | null) => void;
}) {
  const {
    services: { lens, notifications },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const seriesBuilderRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [height, setHeight] = useState<string>('100vh');
  const [seriesId, setSeriesId] = useState<string>('');

  const [lastUpdated, setLastUpdated] = useState<number | undefined>();

  const [lensAttributes, setLensAttributes] = useState<TypedLensByValueInput['attributes'] | null>(
    null
  );

  const { loadIndexPattern, loading } = useAppIndexPatternContext();

  const LensComponent = lens?.EmbeddableComponent;

  const { firstSeriesId, firstSeries: series, setSeries, allSeries } = useSeriesStorage();

  useEffect(() => {
    setSeriesId(firstSeriesId);
  }, [allSeries, firstSeriesId]);

  const lensAttributesT = useLensAttributes();

  const setHeightOffset = () => {
    if (seriesBuilderRef?.current && wrapperRef.current) {
      const headerOffset = wrapperRef.current.getBoundingClientRect().top;
      const seriesOffset = seriesBuilderRef.current.getBoundingClientRect().height;
      setHeight(`calc(100vh - ${seriesOffset + headerOffset + 40}px)`);
    }
  };

  useEffect(() => {
    Object.values(allSeries).forEach((seriesT) => {
      loadIndexPattern({
        dataType: seriesT.dataType,
      });
    });
  }, [allSeries, loadIndexPattern]);

  useEffect(() => {
    setLensAttributes(lensAttributesT);
    if (saveAttributes) {
      saveAttributes(lensAttributesT);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(lensAttributesT ?? {})]);

  useEffect(() => {
    setHeightOffset();
  });

  const timeRange = combineTimeRanges(allSeries, series);

  const onLensLoad = useCallback(() => {
    setLastUpdated(Date.now());
  }, []);

  const onBrushEnd = useCallback(
    ({ range }: { range: number[] }) => {
      if (series?.reportType !== 'data-distribution') {
        setSeries(seriesId, {
          ...series,
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
    [notifications?.toasts, series, seriesId, setSeries]
  );

  return (
    <Wrapper>
      {lens ? (
        <>
          <ExploratoryViewHeader lensAttributes={lensAttributes} seriesId={seriesId} />
          <LensWrapper ref={wrapperRef} height={height}>
            {lensAttributes && timeRange.to && timeRange.from ? (
              <LensComponent
                id="exploratoryView"
                timeRange={timeRange}
                attributes={lensAttributes}
                onLoad={onLensLoad}
                onBrushEnd={onBrushEnd}
              />
            ) : (
              <EmptyView series={series} loading={loading} height={height} />
            )}
          </LensWrapper>
          <SeriesBuilder
            seriesBuilderRef={seriesBuilderRef}
            lastUpdated={lastUpdated}
            multiSeries={multiSeries}
          />
        </>
      ) : (
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.observability.overview.exploratoryView.lensDisabled', {
              defaultMessage:
                'Lens app is not available, please enable Lens to use exploratory view.',
            })}
          </h2>
        </EuiTitle>
      )}
    </Wrapper>
  );
}
const LensWrapper = styled.div<{ height: string }>`
  min-height: 400px;
  height: ${(props) => props.height};

  &&& > div {
    height: 100%;
  }
`;
const Wrapper = styled(EuiPanel)`
  max-width: 1800px;
  min-width: 800px;
  margin: 0 auto;
  width: 100%;
  overflow-x: auto;
`;
