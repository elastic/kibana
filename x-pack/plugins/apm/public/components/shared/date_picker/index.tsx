/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import React, { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { UI_SETTINGS } from '../../../../../../../src/plugins/data/common';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { clearCache } from '../../../services/rest/call_api';
import { fromQuery, toQuery } from '../links/url_helpers';
import { TimePickerQuickRange } from './typings';

export function DatePicker({
  rangeFrom,
  rangeTo,
  refreshPaused,
  refreshInterval,
  onTimeRangeRefresh,
}: {
  rangeFrom?: string;
  rangeTo?: string;
  refreshPaused?: boolean;
  refreshInterval?: number;
  onTimeRangeRefresh: (range: { start: string; end: string }) => void;
}) {
  const history = useHistory();
  const location = useLocation();
  const { core, plugins } = useApmPluginContext();

  const timePickerQuickRanges = core.uiSettings.get<TimePickerQuickRange[]>(
    UI_SETTINGS.TIMEPICKER_QUICK_RANGES
  );

  const commonlyUsedRanges = timePickerQuickRanges.map(
    ({ from, to, display }) => ({
      start: from,
      end: to,
      label: display,
    })
  );

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
    nextRefreshPaused,
    nextRefreshInterval,
  }: {
    nextRefreshPaused: boolean;
    nextRefreshInterval: number;
  }) {
    updateUrl({
      refreshPaused: nextRefreshPaused,
      refreshInterval: nextRefreshInterval,
    });
  }

  function onTimeChange({ start, end }: { start: string; end: string }) {
    updateUrl({ rangeFrom: start, rangeTo: end });
  }

  useEffect(() => {
    // set time if both to and from are given in the url
    if (rangeFrom && rangeTo) {
      plugins.data.query.timefilter.timefilter.setTime({
        from: rangeFrom,
        to: rangeTo,
      });
      return;
    }
  }, [rangeFrom, rangeTo, plugins]);

  return (
    <EuiSuperDatePicker
      start={rangeFrom}
      end={rangeTo}
      isPaused={refreshPaused}
      refreshInterval={refreshInterval}
      onTimeChange={onTimeChange}
      onRefresh={({ start, end }) => {
        clearCache();
        onTimeRangeRefresh({ start, end });
      }}
      onRefreshChange={({
        isPaused: nextRefreshPaused,
        refreshInterval: nextRefreshInterval,
      }) => {
        onRefreshChange({ nextRefreshPaused, nextRefreshInterval });
      }}
      showUpdateButton={true}
      commonlyUsedRanges={commonlyUsedRanges}
    />
  );
}
