/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect } from 'react';
import { EuiSuperDatePicker } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ClientPluginsStart } from '../../../../../plugin';
import { useUrlParams } from '../../../hooks';
import { CLIENT_DEFAULTS } from '../../../../../../common/constants';
import { SyntheticsSettingsContext, SyntheticsRefreshContext } from '../../../contexts';

export const SyntheticsDatePicker = ({ fullWidth }: { fullWidth?: boolean }) => {
  const [getUrlParams, updateUrl] = useUrlParams();
  const { commonlyUsedRanges } = useContext(SyntheticsSettingsContext);
  const { refreshApp } = useContext(SyntheticsRefreshContext);

  const { data } = useKibana<ClientPluginsStart>().services;

  // read time from state and update the url
  const sharedTimeState = data?.query.timefilter.timefilter.getTime();

  const { dateRangeStart: start, dateRangeEnd: end } = getUrlParams();

  useEffect(() => {
    const { from, to } = sharedTimeState ?? {};
    if (from !== start || to !== end) {
      // if it's coming url. let's update shared state
      data?.query.timefilter.timefilter.setTime({ from: start, to: end });
    }

    // only need at start, rest date picker on change fucn will take care off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const euiCommonlyUsedRanges = commonlyUsedRanges
    ? commonlyUsedRanges.map(
        ({ from, to, display }: { from: string; to: string; display: string }) => {
          return {
            start: from,
            end: to,
            label: display,
          };
        }
      )
    : CLIENT_DEFAULTS.COMMONLY_USED_DATE_RANGES;

  return (
    <EuiSuperDatePicker
      width={fullWidth ? 'full' : 'auto'}
      start={start}
      end={end}
      commonlyUsedRanges={euiCommonlyUsedRanges}
      onTimeChange={({ start: startN, end: endN }) => {
        if (data?.query?.timefilter?.timefilter) {
          data?.query.timefilter.timefilter.setTime({ from: startN, to: endN });
        }

        updateUrl({ dateRangeStart: startN, dateRangeEnd: endN });
        refreshApp();
      }}
      onRefresh={refreshApp}
    />
  );
};
