/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamEvent as LangchainEvent } from '@langchain/core/tracers/log_stream';
import { AgentRunEvents } from '../../types';
import { matchGraphName } from '../utils';
import type { EventConverter } from './types';

/**
 * Returns a converter that will handle events for the search agent graph.
 */
export const getSearchAgentGraphConverter = ({
  graphName,
}: {
  graphName: string;
}): EventConverter => {
  const handleEvent = (event: LangchainEvent): boolean => {
    return matchGraphName(event, graphName);
  };

  const convert = (event: LangchainEvent): AgentRunEvents[] => {
    if (isChainStartWithName(event, 'create_planning')) {
      return [createProgressionEvent('planning')];
    }

    if (isChainStartWithName(event, 'retrieve_agent')) {
      return [createProgressionEvent('retrieval')];
    }

    if (isChainStartWithName(event, 'rate_results')) {
      return [createProgressionEvent('analysis')];
    }

    if (isChainStartWithName(event, 'generate_summary')) {
      return [createProgressionEvent('generate_summary')];
    }

    return [];
  };

  return { handleEvent, convert };
};

const createProgressionEvent = (step: string): AgentRunEvents => ({
  type: 'progression',
  progressionType: 'research',
  data: { step },
});

const isChainStartWithName = (event: LangchainEvent, name: string): boolean => {
  return event.event === 'on_chain_start' && event.name === name;
};
