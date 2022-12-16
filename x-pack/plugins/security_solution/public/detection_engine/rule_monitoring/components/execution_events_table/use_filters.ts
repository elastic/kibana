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
} from '../../../../../common/detection_engine/rule_monitoring';

export const useFilters = () => {
  const [logLevels, setLogLevels] = useState<LogLevel[]>([]);
  const [eventTypes, setEventTypes] = useState<RuleExecutionEventType[]>([]);

  const state = useMemo(() => ({ logLevels, eventTypes }), [logLevels, eventTypes]);

  return useMemo(
    () => ({ state, setLogLevels, setEventTypes }),
    [state, setLogLevels, setEventTypes]
  );
};
