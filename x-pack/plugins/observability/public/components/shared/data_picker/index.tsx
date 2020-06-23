/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { UI_SETTINGS, useKibanaUISettings } from '../../../hooks/use_kibana_ui_settings';
import { useQueryParams } from '../../../hooks/use_query_params';
import { fromQuery, toQuery } from '../../../utils/url';

export interface TimePickerTime {
  from: string;
  to: string;
}

interface TimePickerQuickRange extends TimePickerTime {
  display: string;
}

interface TimePickerRefreshInterval {
  pause: boolean;
  value: number;
}

interface QueryParams {
  rangeFrom: string;
  rangeTo: string;
  refreshPaused: boolean;
  refreshInterval: number;
}

interface Props {
  rangeFrom: string;
  rangeTo: string;
}

export const DatePicker = ({ rangeFrom, rangeTo }: Props) => {
  const location = useLocation();
  const history = useHistory();

  // TODO: check if it can be done in another way
  const timePickerQuickRanges = useKibanaUISettings<TimePickerQuickRange[]>(
    UI_SETTINGS.TIMEPICKER_QUICK_RANGES
  );
  const timePickerRefreshInterval = useKibanaUISettings<TimePickerRefreshInterval>(
    UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS
  );

  const commonlyUsedRanges = timePickerQuickRanges.map(({ from, to, display }) => ({
    start: from,
    end: to,
    label: display,
  }));

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

  // TODO: maybe use Generics to specify what this component expects
  const {
    refreshPaused = true,
    refreshInterval = timePickerRefreshInterval.value,
  } = useQueryParams<QueryParams>();

  return (
    <EuiSuperDatePicker
      start={rangeFrom}
      end={rangeTo}
      onTimeChange={onTimeChange}
      // TODO: should be automatically cast to boolean
      isPaused={Boolean(refreshPaused)}
      // TODO: should be automatically cast to number
      refreshInterval={+refreshInterval}
      onRefreshChange={onRefreshChange}
      commonlyUsedRanges={commonlyUsedRanges}
    />
  );
};
