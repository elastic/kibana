/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import React from 'react';
import { fromQuery, toQuery } from '../Links/url_helpers';
import { history } from '../../../utils/history';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { clearCache } from '../../../services/rest/callApi';
import { timePickerDefault } from '../../../context/UrlParamsContext/constants';

export function DatePicker() {
  const location = useLocation();

  const commonlyUsedRanges = timePickerDefault.quickRanges.map(
    ({ from, to, display }: { from: string; to: string; display: string }) => ({
      start: from,
      end: to,
      label: display,
    })
  );

  const { urlParams, refreshTimeRange } = useUrlParams();

  function updateUrl(nextQuery: {
    rangeFrom?: string;
    rangeTo?: string;
    refreshPaused?: boolean;
    refreshInterval?: number;
  }) {
    history.push({
      ...location,
      search: fromQuery({
        ...toQuery(location.search),
        ...nextQuery,
      }),
    });
  }

  function onRefreshChange({
    isPaused,
    refreshInterval,
  }: {
    isPaused: boolean;
    refreshInterval: number;
  }) {
    updateUrl({ refreshPaused: isPaused, refreshInterval });
  }

  function onTimeChange({ start, end }: { start: string; end: string }) {
    updateUrl({ rangeFrom: start, rangeTo: end });
  }

  const { rangeFrom, rangeTo, refreshPaused, refreshInterval } = urlParams;

  return (
    <EuiSuperDatePicker
      start={rangeFrom}
      end={rangeTo}
      isPaused={refreshPaused}
      refreshInterval={refreshInterval}
      onTimeChange={onTimeChange}
      onRefresh={({ start, end }) => {
        clearCache();
        refreshTimeRange({ rangeFrom: start, rangeTo: end });
      }}
      onRefreshChange={onRefreshChange}
      showUpdateButton={true}
      commonlyUsedRanges={commonlyUsedRanges}
    />
  );
}
