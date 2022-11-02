/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiToolTip } from '@elastic/eui';
import React from 'react';

export const CompactFormattedNumber = ({
  number,
  abbreviateAbove = 999999,
}: {
  number: number;
  /** numbers higher than the value of this field will be abbreviated using compact notation and have a tooltip displaying the full value */
  abbreviateAbove?: number;
}) => {
  if (number < abbreviateAbove) {
    return <span>{number.toLocaleString('en-US')}</span>;
  }

  return (
    <EuiToolTip content={number.toLocaleString('en-US')}>
      <span>
        {number.toLocaleString('en-US', {
          notation: 'compact',
          maximumFractionDigits: 1,
        })}
      </span>
    </EuiToolTip>
  );
};
