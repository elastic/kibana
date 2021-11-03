/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect, useMemo } from 'react';
import { useRequestEventCounts } from './use_request_event_counts';

export const useIsThreatIntelModuleEnabled = () => {
  const [isThreatIntelModuleEnabled, setIsThreatIntelModuleEnabled] = useState<
    boolean | undefined
  >();

  const { to, from } = useMemo(
    () => ({
      to: new Date().toISOString(),
      from: new Date(0).toISOString(),
    }),
    []
  );

  const [, { totalCount }] = useRequestEventCounts(to, from);

  useEffect(() => {
    if (totalCount !== -1) {
      setIsThreatIntelModuleEnabled(totalCount > 0);
    }
  }, [totalCount]);

  return isThreatIntelModuleEnabled;
};
