/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';

import React from 'react';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { roundToDecimalPlace } from '../../../utils';

interface Props extends FieldDataRowProps {
  showIcons: boolean;
}
export const DocumentStat = ({ config, showIcons }: Props) => {
  const { stats } = config;
  if (stats === undefined) return null;

  const { count, sampleCount } = stats;
  if (count === undefined || sampleCount === undefined) return null;

  const docsPercent = roundToDecimalPlace((count / sampleCount) * 100);

  return (
    <EuiFlexGroup alignItems={'center'}>
      {showIcons ? (
        <EuiFlexItem className={'dataVisualizerColumnHeaderIcon'}>
          <EuiIcon type="document" size={'s'} />
        </EuiFlexItem>
      ) : null}
      <EuiText size={'s'}>
        {count} ({docsPercent}%)
      </EuiText>
    </EuiFlexGroup>
  );
};
