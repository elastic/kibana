/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import styled from 'styled-components';
import { convertMicrosecondsToMilliseconds as microsToMillis } from '../../../lib/helper';
import { Pagination } from '../../overview/monitor_list';
import { usePingsList } from './use_pings';
import { PingListHeader } from './ping_list_header';
import { PingListTable } from './ping_list_table';

export const SpanWithMargin = styled.span`
  margin-right: 16px;
`;

const DEFAULT_PAGE_SIZE = 10;

// one second = 1 million micros
const ONE_SECOND_AS_MICROS = 1000000;

// the limit for converting to seconds is >= 1 sec
const MILLIS_LIMIT = ONE_SECOND_AS_MICROS * 1;

export const formatDuration = (durationMicros: number) => {
  if (durationMicros < MILLIS_LIMIT) {
    return i18n.translate('xpack.uptime.pingList.durationMsColumnFormatting', {
      values: { millis: microsToMillis(durationMicros) },
      defaultMessage: '{millis} ms',
    });
  }
  const seconds = (durationMicros / ONE_SECOND_AS_MICROS).toFixed(0);

  // we format seconds with correct pluralization here and not for `ms` because it is much more likely users
  // will encounter times of exactly '1' second.
  if (seconds === '1') {
    return i18n.translate('xpack.uptime.pingist.durationSecondsColumnFormatting.singular', {
      values: { seconds },
      defaultMessage: '{seconds} second',
    });
  }
  return i18n.translate('xpack.uptime.pingist.durationSecondsColumnFormatting', {
    values: { seconds },
    defaultMessage: '{seconds} seconds',
  });
};

export const PingList = () => {
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageIndex, setPageIndex] = useState(0);

  const { error, loading, pings, total, failedSteps } = usePingsList({
    pageSize,
    pageIndex,
  });

  const pagination: Pagination = {
    initialPageSize: DEFAULT_PAGE_SIZE,
    pageIndex,
    pageSize,
    pageSizeOptions: [10, 25, 50, 100],
    totalItemCount: total,
  };

  return (
    <EuiPanel hasBorder>
      <PingListHeader />
      <EuiSpacer size="s" />
      <PingListTable
        onChange={(criteria: any) => {
          setPageSize(criteria.page!.size);
          setPageIndex(criteria.page!.index);
        }}
        error={error}
        pings={pings}
        loading={loading}
        pagination={pagination}
        failedSteps={failedSteps}
      />
    </EuiPanel>
  );
};
