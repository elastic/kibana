/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { Dispatch, SetStateAction, useCallback, useState } from 'react';
import styled from 'styled-components';
import { LensEmbeddableInput, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useUiTracker } from '../../../hooks/use_track_metric';
import { useSeriesStorage } from './hooks/use_series_storage';
import { ObservabilityPublicPluginsStart } from '../../../plugin';
import { useExpViewTimeRange } from './hooks/use_time_range';
import { parseRelativeDate } from './components/date_range_picker';
import { trackTelemetryOnLoad } from './utils/telemetry';
import type { ChartTimeRange } from './header/last_updated';

interface Props {
  lensAttributes: TypedLensByValueInput['attributes'];
  setChartTimeRangeContext: Dispatch<SetStateAction<ChartTimeRange | undefined>>;
}

export function LensEmbeddable(props: Props) {
  const { lensAttributes, setChartTimeRangeContext } = props;
  const {
    services: { lens, notifications },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const LensComponent = lens?.EmbeddableComponent;
  const LensSaveModalComponent = lens?.SaveModalComponent;

  const { firstSeries, setSeries, reportType, lastRefresh } = useSeriesStorage();

  const [isSaveOpen, setIsSaveOpen] = useState(false);

  const firstSeriesId = 0;

  const timeRange = useExpViewTimeRange();

  const trackEvent = useUiTracker();

  const onLensLoad = useCallback(
    (isLoading) => {
      const timeLoaded = Date.now();

      setChartTimeRangeContext({
        lastUpdated: timeLoaded,
        to: parseRelativeDate(timeRange?.to || '')?.valueOf(),
        from: parseRelativeDate(timeRange?.from || '')?.valueOf(),
      });

      if (!isLoading) {
        trackTelemetryOnLoad(trackEvent, lastRefresh, timeLoaded);
      }
    },
    [setChartTimeRangeContext, timeRange, lastRefresh, trackEvent]
  );

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

  if (!timeRange || !lensAttributes) {
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
      {isSaveOpen && lensAttributes && (
        <LensSaveModalComponent
          initialInput={lensAttributes as unknown as LensEmbeddableInput}
          onClose={() => setIsSaveOpen(false)}
          // if we want to do anything after the viz is saved
          // right now there is no action, so an empty function
          onSave={() => {}}
        />
      )}
    </LensWrapper>
  );
}

const LensWrapper = styled.div`
  height: 100%;

  .embPanel__optionsMenuPopover {
    visibility: collapse;
  }

  &&&:hover {
    .embPanel__optionsMenuPopover {
      visibility: visible;
    }
  }

  && .embPanel--editing {
    border-style: initial !important;
    :hover {
      box-shadow: none;
    }
  }
  .embPanel__title {
    display: none;
  }

  &&& > div {
    height: 100%;
  }
`;
