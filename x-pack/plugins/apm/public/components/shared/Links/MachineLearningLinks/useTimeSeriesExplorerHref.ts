/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UI_SETTINGS } from '../../../../../../../../src/plugins/data/common';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useMlHref } from '../../../../../../ml/public';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import {
  TimePickerRefreshInterval,
  TimePickerTimeDefaults,
} from '../../DatePicker/typings';

export function useTimeSeriesExplorerHref({
  jobId,
  serviceName,
  transactionType,
}: {
  jobId: string;
  serviceName?: string;
  transactionType?: string;
}) {
  // default to link to ML Anomaly Detection jobs management page
  const {
    core,
    plugins: { ml },
  } = useApmPluginContext();
  const { urlParams } = useUrlParams();
  const { rangeFrom, rangeTo, refreshInterval, refreshPaused } = urlParams;

  const timePickerTimeDefaults = core.uiSettings.get<TimePickerTimeDefaults>(
    UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS
  );

  const timePickerRefreshIntervalDefaults = core.uiSettings.get<TimePickerRefreshInterval>(
    UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS
  );

  const mlAnomalyDetectionHref = useMlHref(ml, core.http.basePath.get(), {
    page: 'timeseriesexplorer',
    pageState: {
      jobIds: [jobId],
      timeRange: {
        from: rangeFrom ?? timePickerTimeDefaults.from,
        to: rangeTo ?? timePickerTimeDefaults.to,
      },
      refreshInterval: {
        pause: refreshPaused ?? timePickerRefreshIntervalDefaults.pause,
        value: refreshInterval ?? timePickerRefreshIntervalDefaults.value,
      },
      ...(serviceName && transactionType
        ? {
            entities: {
              'service.name': serviceName,
              'transaction.type': transactionType,
            },
          }
        : {}),
    },
  });

  return mlAnomalyDetectionHref;
}
