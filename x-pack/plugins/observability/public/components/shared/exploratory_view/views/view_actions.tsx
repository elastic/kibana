/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { allSeriesKey, convertAllShortSeries, useSeriesStorage } from '../hooks/use_series_storage';

interface Props {
  onApply?: () => void;
}

export function ViewActions({ onApply }: Props) {
  const { allSeries, storage, applyChanges } = useSeriesStorage();

  const noChanges = isEqual(allSeries, convertAllShortSeries(storage.get(allSeriesKey) ?? []));

  return (
    <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiButton onClick={() => applyChanges(onApply)} isDisabled={noChanges} fill size="s">
          {i18n.translate('xpack.observability.expView.seriesBuilder.apply', {
            defaultMessage: 'Apply changes',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
