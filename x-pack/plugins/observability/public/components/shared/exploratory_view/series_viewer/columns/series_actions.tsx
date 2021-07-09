/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RemoveSeries } from './remove_series';
import { useSeriesStorage } from '../../hooks/use_series_storage';

interface Props {
  seriesId: string;
  editorMode?: boolean;
}
export function SeriesActions({ seriesId, editorMode = false }: Props) {
  const { getSeries, setSeries, allSeries } = useSeriesStorage();
  const series = getSeries(seriesId);

  const copySeries = () => {
    let copySeriesId: string = `${seriesId}-copy`;
    if (allSeries.find(({ name }) => name === copySeriesId)) {
      copySeriesId = copySeriesId + allSeries.length;
    }
    setSeries(copySeriesId, { ...series, name: copySeriesId, order: allSeries.length++ });
  };

  const toggleSeries = () => {
    if (series.hidden) {
      setSeries(seriesId, { ...series, hidden: undefined });
    } else {
      setSeries(seriesId, { ...series, hidden: true });
    }
  };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="center">
      {editorMode && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={series.hidden ? 'eyeClosed' : 'eye'}
            aria-label={i18n.translate('xpack.observability.seriesEditor.hide', {
              defaultMessage: 'Hide series',
            })}
            size="s"
            color="text"
            onClick={toggleSeries}
          />
        </EuiFlexItem>
      )}
      {editorMode && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={'copy'}
            color="text"
            aria-label={i18n.translate('xpack.observability.seriesEditor.clone', {
              defaultMessage: 'Copy series',
            })}
            size="s"
            onClick={copySeries}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <RemoveSeries seriesId={seriesId} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
