/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RemoveSeries } from './remove_series';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { SeriesUrl } from '../../types';

interface Props {
  seriesId: number;
  series: SeriesUrl;
  editorMode?: boolean;
}
export function SeriesActions({ seriesId, series, editorMode = false }: Props) {
  const { setSeries, allSeries } = useSeriesStorage();

  const copySeries = () => {
    let copySeriesId: string = `${seriesId}-copy`;
    if (allSeries.find(({ name }) => name === copySeriesId)) {
      copySeriesId = copySeriesId + allSeries.length;
    }
    setSeries(allSeries.length, { ...series, name: copySeriesId });
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
          <EuiToolTip
            content={i18n.translate('xpack.observability.seriesEditor.hide', {
              defaultMessage: 'Hide series',
            })}
          >
            <EuiButtonIcon
              iconType={series.hidden ? 'eyeClosed' : 'eye'}
              aria-label={i18n.translate('xpack.observability.seriesEditor.hide', {
                defaultMessage: 'Hide series',
              })}
              size="s"
              color="text"
              onClick={toggleSeries}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {editorMode && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.observability.seriesEditor.clone', {
              defaultMessage: 'Copy series',
            })}
          >
            <EuiButtonIcon
              iconType={'copy'}
              color="text"
              aria-label={i18n.translate('xpack.observability.seriesEditor.clone', {
                defaultMessage: 'Copy series',
              })}
              size="s"
              onClick={copySeries}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <RemoveSeries seriesId={seriesId} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
