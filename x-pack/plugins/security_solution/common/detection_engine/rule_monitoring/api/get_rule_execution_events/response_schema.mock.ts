/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleExecutionEventMock } from '../../model/execution_event.mock';
import type { GetRuleExecutionEventsResponse } from './response_schema';

const getSomeResponse = (): GetRuleExecutionEventsResponse => {
  const events = ruleExecutionEventMock.getSomeEvents();
  return {
    events,
    pagination: {
      page: 1,
      per_page: events.length,
      total: events.length * 10,
    },
  };
};

export const getRuleExecutionEventsResponseMock = {
  getSomeResponse,
};
