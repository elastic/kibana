/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';

import { adHocRun } from '../api/api';

export const useAdHocRun = ({
  id,
  timeframeStart,
  timeframeEnd,
}: {
  id: string;
  timeframeStart: moment.Moment;
  timeframeEnd: moment.Moment;
}) => {
  const from = useMemo(() => timeframeStart.toISOString(), [timeframeStart]);
  const to = useMemo(() => timeframeEnd.toISOString(), [timeframeEnd]);

  const ruleRun = useCallback(async () => {
    const abortCtrl = new AbortController();
    await adHocRun({ signal: abortCtrl.signal, id, from, to });
  }, [from, id, to]);

  return { adHocRun: ruleRun };
};
