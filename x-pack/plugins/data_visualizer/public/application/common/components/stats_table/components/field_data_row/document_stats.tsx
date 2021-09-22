/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiText } from '@elastic/eui';

import React from 'react';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { roundToDecimalPlace } from '../../../utils';

interface Props extends FieldDataRowProps {
  showIcon?: boolean;
}
export const DocumentStat = ({ config, showIcon }: Props) => {
  const { stats } = config;
  if (stats === undefined) return null;

  const { count, sampleCount } = stats;
  if (count === undefined || sampleCount === undefined) return null;

  const docsPercent = roundToDecimalPlace((count / sampleCount) * 100);

  return (
    <>
      {showIcon ? <EuiIcon type="document" size={'m'} className={'columnHeaderIcon'} /> : null}
      <EuiText size={'xs'}>
        {count} ({docsPercent}%)
      </EuiText>
    </>
  );
};
