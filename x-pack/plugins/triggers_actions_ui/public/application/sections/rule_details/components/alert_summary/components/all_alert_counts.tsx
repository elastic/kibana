/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import numeral from '@elastic/numeral';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { ALERT_COUNT_FORMAT, ALERTS_LABEL } from './constants';

interface Props {
  count: number;
}

export const AllAlertCounts = ({ count }: Props) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiText color={euiTheme.colors.primaryText}>
        <h3 data-test-subj="totalAlertsCount">{numeral(count).format(ALERT_COUNT_FORMAT)}</h3>
      </EuiText>
      <EuiText size="s" color="subdued">
        {ALERTS_LABEL}
      </EuiText>
    </>
  );
};
