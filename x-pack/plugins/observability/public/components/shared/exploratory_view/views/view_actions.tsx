/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEqual, pickBy } from 'lodash';
import { allSeriesKey, convertAllShortSeries, useSeriesStorage } from '../hooks/use_series_storage';
import { SeriesUrl } from '../types';

interface Props {
  onApply?: () => void;
}

export function removeUndefinedEmptyValues(series: SeriesUrl) {
  const resultSeries = removeUndefinedProps(series) as SeriesUrl;
  Object.entries(resultSeries).forEach(([prop, value]) => {
    if (typeof value === 'object') {
      // @ts-expect-error
      resultSeries[prop] = removeUndefinedEmptyValues(value);
    }
  });
  return resultSeries;
}

export function removeUndefinedProps<T extends object>(obj: T): Partial<T> {
  return pickBy(obj, (value) => value !== undefined);
}

export function ViewActions({ onApply }: Props) {
  const { allSeries, storage, applyChanges } = useSeriesStorage();

  const urlAllSeries = convertAllShortSeries(storage.get(allSeriesKey) ?? []);

  let noChanges = allSeries.length === urlAllSeries.length;

  if (noChanges) {
    noChanges = !allSeries.some(
      (series, index) =>
        !isEqual(
          removeUndefinedEmptyValues(series),
          removeUndefinedEmptyValues(urlAllSeries[index])
        )
    );
  }

  return (
    <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={() => applyChanges(onApply)}
          isDisabled={noChanges}
          fill
          data-test-subj={'seriesChangesApplyButton'}
        >
          {i18n.translate('xpack.observability.expView.seriesBuilder.apply', {
            defaultMessage: 'Apply changes',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
