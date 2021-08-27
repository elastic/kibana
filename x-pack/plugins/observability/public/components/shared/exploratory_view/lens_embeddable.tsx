/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { Dispatch, SetStateAction, useCallback } from 'react';
import { combineTimeRanges } from './exploratory_view';
import { TypedLensByValueInput } from '../../../../../lens/public';
import { useSeriesStorage } from './hooks/use_series_storage';
import { ObservabilityPublicPluginsStart } from '../../../plugin';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

interface Props {
  lensAttributes: TypedLensByValueInput['attributes'];
  setLastUpdated: Dispatch<SetStateAction<number | undefined>>;
}

export function LensEmbeddable(props: Props) {
  const { lensAttributes, setLastUpdated } = props;

  const {
    services: { lens, notifications },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const LensComponent = lens?.EmbeddableComponent;

  const { firstSeriesId, firstSeries: series, setSeries, allSeries } = useSeriesStorage();

  const timeRange = combineTimeRanges(allSeries, series);

  const onLensLoad = useCallback(() => {
    setLastUpdated(Date.now());
  }, [setLastUpdated]);

  const onBrushEnd = useCallback(
    ({ range }: { range: number[] }) => {
      if (series?.reportType !== 'data-distribution') {
        setSeries(firstSeriesId, {
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
    [notifications?.toasts, series, firstSeriesId, setSeries]
  );

  return (
    <LensComponent
      id="exploratoryView"
      timeRange={timeRange}
      attributes={lensAttributes}
      onLoad={onLensLoad}
      onBrushEnd={onBrushEnd}
    />
  );
}
