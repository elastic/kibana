/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import moment from 'moment';
import { useCallback, useEffect, useState } from 'react';
import type { InputTimeRange } from '@kbn/data-plugin/public/query';
import { useKibana } from './use_kibana';

function getDatesFromDataPluginStart(data: DataPublicPluginStart) {
  const { from, to } = data.query.timefilter.timefilter.getTime();

  return {
    from,
    to,
    start: datemath.parse(from) ?? moment().subtract(15, 'minutes'),
    end: datemath.parse(to, { roundUp: true }) ?? moment(),
  };
}

export function useDateRange() {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();

  const [time, setTime] = useState(() => {
    return getDatesFromDataPluginStart(data);
  });

  useEffect(() => {
    const subscription = data.query.timefilter.timefilter.getTimeUpdate$().subscribe({
      next: () => {
        setTime(() => {
          return getDatesFromDataPluginStart(data);
        });
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [data]);

  const setRange = useCallback(
    (inputRange: InputTimeRange) => {
      return data.query.timefilter.timefilter.setTime(inputRange);
    },
    [data]
  );

  return [time, setRange] as const;
}
