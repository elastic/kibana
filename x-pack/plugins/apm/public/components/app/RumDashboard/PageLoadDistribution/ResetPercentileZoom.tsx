/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiHideFor,
  EuiShowFor,
  EuiButtonIcon,
} from '@elastic/eui';
import { I18LABELS } from '../translations';
import { PercentileRange } from './index';

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
  return (
    <>
      <EuiShowFor sizes={['xs']}>
        <EuiButtonIcon
          iconType="inspect"
          size="s"
          aria-label={I18LABELS.resetZoom}
          onClick={onClick}
          disabled={isDisabled}
        />
      </EuiShowFor>
      <EuiHideFor sizes={['xs']}>
        <EuiButtonEmpty
          iconType="inspect"
          size="s"
          onClick={onClick}
          disabled={isDisabled}
        >
          {I18LABELS.resetZoom}
        </EuiButtonEmpty>
      </EuiHideFor>
    </>
  );
}
