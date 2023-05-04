/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { throttle } from 'lodash/fp';
import { useEffect, useMemo, useState } from 'react';
import useResizeObserver from 'use-resize-observer/polyfilled';
import { niceTimeFormatByDay, timeFormatter } from '@elastic/charts';
import moment from 'moment-timezone';
import type {
  CloudExperimentsFeatureFlagNames,
  CloudExperimentsPluginStart,
} from '@kbn/cloud-experiments-plugin/common';

export const getDaysDiff = (minDate: moment.Moment, maxDate: moment.Moment) => {
  const diff = maxDate.diff(minDate, 'days');

  if (diff <= 1 && !minDate.isSame(maxDate)) {
    return 2; // to return proper pattern from niceTimeFormatByDay
  }

  return diff;
};

export const histogramDateTimeFormatter = (domain: [string, string] | null, fixedDiff?: number) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const diff = fixedDiff ?? getDaysDiff(moment(domain![0]), moment(domain![1]));
  const format = niceTimeFormatByDay(diff);
  return timeFormatter(format);
};

export const useThrottledResizeObserver = (wait = 100) => {
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const onResize = useMemo(() => throttle(wait, setSize), [wait]);
  const { ref } = useResizeObserver<HTMLDivElement>({ onResize });

  return { ref, ...size };
};

/**
 * Retrieves the variation of the feature flag if the cloudExperiments plugin is enabled.
 * @param cloudExperiments {@link CloudExperimentsPluginStart}
 * @param featureFlagName The name of the feature flag {@link CloudExperimentsFeatureFlagNames}
 * @param defaultValue The default value in case it cannot retrieve the feature flag
 * @param setter The setter from {@link useState} to update the value.
 */
export const useVariation = <Data>(
  cloudExperiments: CloudExperimentsPluginStart | undefined,
  featureFlagName: CloudExperimentsFeatureFlagNames,
  defaultValue: Data,
  setter: (value: Data) => void
) => {
  useEffect(() => {
    (async function loadVariation() {
      const variationUrl = await cloudExperiments?.getVariation(featureFlagName, defaultValue);
      if (variationUrl) {
        setter(variationUrl);
      }
    })();
  }, [cloudExperiments, featureFlagName, defaultValue, setter]);
};
