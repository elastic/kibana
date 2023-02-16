/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import numeral from '@elastic/numeral';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { ACTIVE_NOW_LABEL, ALERT_COUNT_FORMAT } from './constants';

interface Props {
  activeAlertCount: number;
}

export const ActiveAlertCounts = ({ activeAlertCount }: Props) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiText
        color={!!activeAlertCount ? euiTheme.colors.dangerText : euiTheme.colors.successText}
      >
        <h3 data-test-subj="activeAlertsCount">
          {numeral(activeAlertCount).format(ALERT_COUNT_FORMAT)}
          {!!activeAlertCount && (
            <>
              &nbsp;
              <EuiIcon type="alert" ascent={10} />
            </>
          )}
        </h3>
      </EuiText>
      <EuiText size="s" color="subdued">
        {ACTIVE_NOW_LABEL}
      </EuiText>
    </>
  );
};
