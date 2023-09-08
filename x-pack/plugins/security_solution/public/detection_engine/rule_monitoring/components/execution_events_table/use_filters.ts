/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';

import type {
  LogLevel,
  RuleExecutionEventType,
} from '../../../../../common/api/detection_engine/rule_monitoring';

export const useFilters = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [logLevels, setLogLevels] = useState<LogLevel[]>([]);
  const [eventTypes, setEventTypes] = useState<RuleExecutionEventType[]>([]);

  const state = useMemo(
    () => ({ searchTerm, logLevels, eventTypes }),
    [searchTerm, logLevels, eventTypes]
  );

  return useMemo(
    () => ({
      state,
      setSearchTerm,
      setLogLevels,
      setEventTypes,
    }),
    [state, setSearchTerm, setLogLevels, setEventTypes]
  );
};
