/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { TimeRange } from '../../../../../../../../src/plugins/data/common';
import { ObservabilityPublicPluginsStart } from '../../../../plugin';

export function useDefaultTimeRange() {
  const { data } = useKibana<ObservabilityPublicPluginsStart>().services;

  const [time, setTime] = useState<TimeRange>();

  const { to, from, mode } = data.query.timefilter.timefilter.getTime();

  useEffect(() => {
    const update$ = data.query.timefilter.timefilter.getTimeUpdate$();

    update$.subscribe((value) => {
      setTime(data.query.timefilter.timefilter.getTime());
    });
  }, [data.query.timefilter.timefilter]);

  return useMemo(() => {
    return time || { to, from, mode };
  }, [time, to, from, mode]);
}
