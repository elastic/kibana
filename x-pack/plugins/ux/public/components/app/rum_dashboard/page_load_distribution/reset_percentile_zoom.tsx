/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiHideFor,
  EuiShowFor,
  EuiButtonIcon,
  EuiFlexItem,
} from '@elastic/eui';
import { I18LABELS } from '../translations';
import { PercentileRange } from '.';

interface Props {
  percentileRange: PercentileRange;
  setPercentileRange: (value: PercentileRange) => void;
}
export function ResetPercentileZoom({
  percentileRange,
  setPercentileRange,
}: Props) {
  const isDisabled =
    percentileRange.min === null && percentileRange.max === null;
  const onClick = () => {
    setPercentileRange({ min: null, max: null });
  };
  return !isDisabled ? (
    <EuiFlexItem grow={false}>
      <EuiShowFor sizes={['xs']}>
        <EuiButtonIcon
          iconType="inspect"
          size="s"
          aria-label={I18LABELS.resetZoom}
          onClick={onClick}
        />
      </EuiShowFor>
      <EuiHideFor sizes={['xs']}>
        <EuiButtonEmpty iconType="inspect" size="s" onClick={onClick}>
          {I18LABELS.resetZoom}
        </EuiButtonEmpty>
      </EuiHideFor>
    </EuiFlexItem>
  ) : null;
}
