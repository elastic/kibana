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
import { SeriesConfig, SeriesUrl } from '../../types';
import { useDiscoverLink } from '../../hooks/use_discover_link';

interface Props {
  seriesId: number;
  series: SeriesUrl;
  seriesConfig: SeriesConfig;
}
export function SeriesActions({ seriesId, series, seriesConfig }: Props) {
  const { setSeries, allSeries } = useSeriesStorage();

  const { href: discoverHref } = useDiscoverLink({ series, seriesConfig });

  const copySeries = () => {
    let copySeriesId: string = `${series.name}-copy`;
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
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate('xpack.observability.seriesEditor.sampleDocuments', {
            defaultMessage: 'View sample documents in new tab',
          })}
        >
          <EuiButtonIcon
            iconType="discoverApp"
            aria-label={i18n.translate('xpack.observability.seriesEditor.sampleDocuments', {
              defaultMessage: 'View sample documents in new tab',
            })}
            size="s"
            color="text"
            target="_blank"
            href={discoverHref}
            isDisabled={!series.dataType || !series.selectedMetricField}
          />
        </EuiToolTip>
      </EuiFlexItem>

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
      <EuiFlexItem grow={false}>
        <RemoveSeries seriesId={seriesId} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
