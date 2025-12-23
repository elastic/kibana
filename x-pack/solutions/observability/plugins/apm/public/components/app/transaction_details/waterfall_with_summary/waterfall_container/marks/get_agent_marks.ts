/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import type { Mark } from '.';

// Extends Mark without adding new properties to it.
export interface AgentMark extends Mark {
  type: 'agentMark';
}

export function getAgentMarks(marks?: Record<string, number>): AgentMark[] {
  if (!marks) {
    return [];
  }

  return sortBy(
    Object.entries(marks).map(([name, ms]) => ({
      type: 'agentMark',
      id: name,
      offset: ms * 1000,
      verticalLine: true,
    })),
    'offset'
  );
}
