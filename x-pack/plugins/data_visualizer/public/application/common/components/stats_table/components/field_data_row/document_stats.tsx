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
import { isIndexBasedFieldVisConfig } from '../../types';

interface Props extends FieldDataRowProps {
  showIcon?: boolean;
  totalCount?: number;
}
export const DocumentStat = ({ config, showIcon, totalCount }: Props) => {
  const { stats } = config;
  if (stats === undefined) return null;
  const { count, sampleCount, totalDocuments } = stats;
  const total = totalDocuments ?? sampleCount ?? totalCount;

  // If field exists is docs but we don't have count stats then don't show
  // Otherwise if field doesn't appear in docs at all, show 0%
  const valueCount =
    count ?? (isIndexBasedFieldVisConfig(config) && config.existsInDocs === true ? undefined : 0);
  const docsPercent =
    valueCount !== undefined && total !== undefined
      ? roundToDecimalPlace((valueCount / total) * 100)
      : 0;

  return valueCount !== undefined ? (
    <>
      {showIcon ? <EuiIcon type="document" size={'m'} className={'columnHeader__icon'} /> : null}
      <EuiText size={'xs'}>
        {valueCount} ({docsPercent}%)
      </EuiText>
    </>
  ) : null;
};
