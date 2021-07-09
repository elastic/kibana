/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { isEmpty } from 'lodash';
import { AllSeries } from '../../hooks/use_series_storage';

export function SeriesFooter({ allSeries }: { allSeries: AllSeries }) {
  const incompleteSeries = allSeries.filter(
    ({ dataType, reportDefinitions }) => !dataType || isEmpty(reportDefinitions)
  );

  const hiddenSeries = Object.values(allSeries).filter(({ hidden }) => hidden);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiText size="xs" color="subdued">
          Total: {allSeries.length} series
        </EuiText>
      </EuiFlexItem>
      {incompleteSeries.length > 0 && (
        <EuiFlexItem>
          <EuiText size="xs" color="warning">
            {incompleteSeries.length} Incomplete series
          </EuiText>
        </EuiFlexItem>
      )}
      {hiddenSeries.length > 0 && (
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <strong> {hiddenSeries.length} Hidden series</strong>
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
