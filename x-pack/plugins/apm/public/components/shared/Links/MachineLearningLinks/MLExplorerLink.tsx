/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { EuiLink } from '@elastic/eui';
import { UI_SETTINGS } from '../../../../../../../../src/plugins/data/common';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useMlHref, ML_PAGES } from '../../../../../../ml/public';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { TimePickerRefreshInterval } from '../../DatePicker/typings';

interface Props {
  children?: ReactNode;
  jobId: string;
  external?: boolean;
}

export function MLExplorerLink({ jobId, external, children }: Props) {
  const href = useExplorerHref({ jobId });

  return (
    <EuiLink
      children={children}
      href={href}
      external={external}
      target={external ? '_blank' : undefined}
    />
  );
}

export function useExplorerHref({ jobId }: { jobId: string }) {
  const {
    core,
    plugins: { ml },
  } = useApmPluginContext();
  const { urlParams } = useUrlParams();

  const timePickerRefreshIntervalDefaults = core.uiSettings.get<TimePickerRefreshInterval>(
    UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS
  );

  const {
    // hardcoding a custom default of 1 hour since the default kibana timerange of 15 minutes is shorter than the ML interval
    rangeFrom = 'now-1h',
    rangeTo = 'now',
    refreshInterval = timePickerRefreshIntervalDefaults.value,
    refreshPaused = timePickerRefreshIntervalDefaults.pause,
  } = urlParams;

  const href = useMlHref(ml, core.http.basePath.get(), {
    page: ML_PAGES.ANOMALY_EXPLORER,
    pageState: {
      jobIds: [jobId],
      timeRange: { from: rangeFrom, to: rangeTo },
      refreshInterval: { pause: refreshPaused, value: refreshInterval },
    },
  });

  return href;
}
