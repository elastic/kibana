/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import numeral from '@elastic/numeral';
import {
  EuiIcon,
  EuiTitle,
  EuiText,
  EuiTextColor,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  ACTIVE_ALERT_COUNT_DATA_TEST_SUBJ,
  ACTIVE_NOW_LABEL,
  ALERT_COUNT_FORMAT,
} from './constants';

interface Props {
  activeAlertCount: number;
}

export const ActiveAlertCounts = ({ activeAlertCount }: Props) => {
  const { euiTheme } = useEuiTheme();
  const describedTextId = useGeneratedHtmlId();

  return (
    <>
      <EuiTitle size="s">
        <EuiTextColor
          data-test-subj={ACTIVE_ALERT_COUNT_DATA_TEST_SUBJ}
          color={!!activeAlertCount ? euiTheme.colors.dangerText : euiTheme.colors.successText}
          aria-describedby={describedTextId}
        >
          {numeral(activeAlertCount).format(ALERT_COUNT_FORMAT)}
          {!!activeAlertCount && (
            <>
              &nbsp;
              <EuiIcon type="warning" ascent={10} />
            </>
          )}
        </EuiTextColor>
      </EuiTitle>
      <EuiText size="s" color="subdued" id={describedTextId}>
        {ACTIVE_NOW_LABEL}
      </EuiText>
    </>
  );
};
