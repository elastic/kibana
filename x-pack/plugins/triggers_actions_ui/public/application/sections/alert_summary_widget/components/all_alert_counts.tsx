/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import numeral from '@elastic/numeral';
import { EuiText, EuiTitle, EuiTextColor, useGeneratedHtmlId } from '@elastic/eui';
import {
  ALERT_COUNT_FORMAT,
  ALERTS_LABEL,
  TOTAL_ALERT_COUNT_DATA_TEST_SUBJ,
  ALL_ALERT_COLOR,
} from './constants';

interface Props {
  count: number;
}

export const AllAlertCounts = ({ count }: Props) => {
  const describedTextId = useGeneratedHtmlId();

  return (
    <>
      <EuiTitle size="s">
        <EuiTextColor
          color={ALL_ALERT_COLOR}
          data-test-subj={TOTAL_ALERT_COUNT_DATA_TEST_SUBJ}
          aria-describedby={describedTextId}
        >
          {numeral(count).format(ALERT_COUNT_FORMAT)}
        </EuiTextColor>
      </EuiTitle>
      <EuiText size="s" color="subdued" id={describedTextId}>
        {ALERTS_LABEL}
      </EuiText>
    </>
  );
};
