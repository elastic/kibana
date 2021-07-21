/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { RemoveSeries } from './remove_series';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { SeriesUrl } from '../../types';

interface Props {
  seriesId: string;
  editorMode?: boolean;
}
export function SeriesActions({ seriesId, editorMode = false }: Props) {
  const { getSeries, setSeries, allSeriesIds, removeSeries } = useSeriesStorage();
  const series = getSeries(seriesId);

  const onEdit = () => {
    setSeries(seriesId, { ...series, isNew: true });
  };

  const copySeries = () => {
    let copySeriesId: string = `${seriesId}-copy`;
    if (allSeriesIds.includes(copySeriesId)) {
      copySeriesId = copySeriesId + allSeriesIds.length;
    }
    setSeries(copySeriesId, series);
  };

  const { reportType, reportDefinitions, isNew, ...restSeries } = series;
  const isSaveAble = reportType && !isEmpty(reportDefinitions);

  const saveSeries = () => {
    if (isSaveAble) {
      const reportDefId = Object.values(reportDefinitions ?? {})[0];
      let newSeriesId = `${reportDefId}-${reportType}`;

      if (allSeriesIds.includes(newSeriesId)) {
        newSeriesId = `${newSeriesId}-${allSeriesIds.length}`;
      }
      const newSeriesN: SeriesUrl = {
        ...restSeries,
        reportType,
        reportDefinitions,
      };

      setSeries(newSeriesId, newSeriesN);
      removeSeries(seriesId);
    }
  };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="center">
      {!editorMode && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="documentEdit"
            aria-label={i18n.translate('xpack.observability.seriesEditor.edit', {
              defaultMessage: 'Edit series',
            })}
            size="s"
            onClick={onEdit}
          />
        </EuiFlexItem>
      )}
      {editorMode && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={'save'}
            aria-label={i18n.translate('xpack.observability.seriesEditor.save', {
              defaultMessage: 'Save series',
            })}
            size="s"
            onClick={saveSeries}
            color="success"
            isDisabled={!isSaveAble}
          />
        </EuiFlexItem>
      )}
      {editorMode && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={'copy'}
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
