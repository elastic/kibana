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
import { NEW_SERIES_KEY, useSeriesStorage } from '../../hooks/use_series_storage';

interface Props {
  seriesId: string;
}
export function SeriesActions({ seriesId }: Props) {
  const { getSeries, removeSeries, setSeries } = useSeriesStorage();
  const series = getSeries(seriesId);

  const onEdit = () => {
    removeSeries(seriesId);
    setSeries(NEW_SERIES_KEY, { ...series });
  };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType={'documentEdit'}
          aria-label={i18n.translate('xpack.observability.seriesEditor.edit', {
            defaultMessage: 'Edit series',
          })}
          size="m"
          onClick={onEdit}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <RemoveSeries seriesId={seriesId} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
