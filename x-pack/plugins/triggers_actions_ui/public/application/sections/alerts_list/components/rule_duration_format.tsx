/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiToolTip } from '@elastic/eui';
import { getFormattedDuration, getFormattedMilliseconds } from '../../../lib/monitoring_utils';

interface Props {
  duration: number;
}

export const RuleDurationFormat = memo((props: Props) => {
  const { duration } = props;

  return (
    <EuiToolTip
      data-test-subj="rule-duration-format-tooltip"
      content={getFormattedMilliseconds(duration)}
    >
      <span data-test-subj="rule-duration-format-value">{getFormattedDuration(duration)}</span>
    </EuiToolTip>
  );
});
