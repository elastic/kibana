/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';

import React from 'react';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { roundToDecimalPlace } from '../../../../formatters/round_to_decimal_place';

export const DocumentStat = ({ config }: FieldDataRowProps) => {
  const { stats } = config;
  if (stats === undefined) return null;

  const { count, sampleCount } = stats;
  if (count === undefined || sampleCount === undefined) return null;

  const docsPercent = roundToDecimalPlace((count / sampleCount) * 100);

  return (
    <EuiFlexGroup alignItems={'center'}>
      <EuiFlexItem className={'mlDataVisualizerColumnHeaderIcon'}>
        <EuiIcon type="document" size={'s'} />
      </EuiFlexItem>
      <EuiText size={'s'}>
        <b>{count}</b> ({docsPercent}%)
      </EuiText>
    </EuiFlexGroup>
  );
};
