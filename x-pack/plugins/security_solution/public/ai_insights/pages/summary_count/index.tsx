/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useMemo, useState } from 'react';
import moment from 'moment';

import { ALERTS, INSIGHTS, LAST_GENERATED } from './translations';

export const EMPTY_LAST_UPDATED_DATE = '--';

interface Props {
  alertsCount: number;
  insightsCount: number;
  lastUpdated: Date | null;
}

const SummaryCountComponent = ({ alertsCount, insightsCount, lastUpdated }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [formattedDate, setFormattedDate] = useState<string>(EMPTY_LAST_UPDATED_DATE);

  useEffect(() => {
    // immediately update the formatted date when lastUpdated is updated:
    if (moment(lastUpdated).isValid()) {
      setFormattedDate(moment(lastUpdated).fromNow());
    }

    // periodically update the formatted date as time passes:
    const intervalId = setInterval(() => {
      if (moment(lastUpdated).isValid()) {
        setFormattedDate(moment(lastUpdated).fromNow());
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [lastUpdated]);

  const Separator = useMemo(
    () => (
      <EuiText
        css={css`
          color: ${euiTheme.colors.lightShade};
        `}
        size="s"
      >
        <EuiFlexItem
          css={css`
            margin-left: ${euiTheme.size.s};
            margin-right: ${euiTheme.size.s};
          `}
          grow={false}
        >
          {'|'}
        </EuiFlexItem>
      </EuiText>
    ),
    [euiTheme.colors.lightShade, euiTheme.size.s]
  );

  return (
    <EuiText
      css={css`
        font-weight: 700;
      `}
      data-test-subj="summaryCount"
      size="xs"
    >
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem data-test-subj="insightsCount" grow={false}>
          {INSIGHTS(insightsCount)}
        </EuiFlexItem>

        {Separator}

        <EuiFlexItem data-test-subj="alertsCount" grow={false}>
          {ALERTS(alertsCount)}
        </EuiFlexItem>

        {lastUpdated != null && (
          <>
            {Separator}

            <EuiFlexItem data-test-subj="lastGenerated" grow={false}>
              {LAST_GENERATED}
              {': '}
              {formattedDate}
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    </EuiText>
  );
};

SummaryCountComponent.displayName = 'SummaryCount';

export const SummaryCount = React.memo(SummaryCountComponent);
