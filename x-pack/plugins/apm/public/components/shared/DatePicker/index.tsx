/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import React, { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { UI_SETTINGS } from '../../../../../../../src/plugins/data/common';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { clearCache } from '../../../services/rest/callApi';
import { fromQuery, toQuery } from '../Links/url_helpers';
import { TimePickerQuickRange, TimePickerTimeDefaults } from './typings';

export function DatePicker() {
  const history = useHistory();
  const location = useLocation();
  const { core, plugins } = useApmPluginContext();

  const timePickerQuickRanges = core.uiSettings.get<TimePickerQuickRange[]>(
    UI_SETTINGS.TIMEPICKER_QUICK_RANGES
  );

  const timePickerTimeDefaults = core.uiSettings.get<TimePickerTimeDefaults>(
    UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS
  );

  const commonlyUsedRanges = timePickerQuickRanges.map(
    ({ from, to, display }) => ({
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

  useEffect(() => {
    // set time if both to and from are given in the url
    if (urlParams.rangeFrom && urlParams.rangeTo) {
      plugins.data.query.timefilter.timefilter.setTime({
        from: urlParams.rangeFrom,
        to: urlParams.rangeTo,
      });
      return;
    }

    // read time from state and update the url
    const timePickerSharedState = plugins.data.query.timefilter.timefilter.getTime();

    history.replace({
      ...location,
      search: fromQuery({
        ...toQuery(location.search),
        rangeFrom:
          urlParams.rangeFrom ??
          timePickerSharedState.from ??
          timePickerTimeDefaults.from,
        rangeTo:
          urlParams.rangeTo ??
          timePickerSharedState.to ??
          timePickerTimeDefaults.to,
      }),
    });
  }, [
    urlParams.rangeFrom,
    urlParams.rangeTo,
    plugins,
    history,
    location,
    timePickerTimeDefaults,
  ]);

  return (
    <EuiSuperDatePicker
      start={urlParams.rangeFrom}
      end={urlParams.rangeTo}
      isPaused={urlParams.refreshPaused}
      refreshInterval={urlParams.refreshInterval}
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
