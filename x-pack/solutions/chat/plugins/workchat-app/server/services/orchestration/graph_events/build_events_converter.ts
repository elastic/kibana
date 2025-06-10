/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamEvent as LangchainEvent } from '@langchain/core/tracers/log_stream';
import { AgentRunEvents } from '../types';
import {
  EventConverter,
  getSimpleGraphConverter,
  getSearchAgentGraphConverter,
} from './converters';
import { graphNames } from '../constants';

export type GraphEventConverter = (event: LangchainEvent) => AgentRunEvents[];

/**
 * Build the event converter based on the agent graph definition.
 *
 * Note: this is totally static for now, but will become dynamic once we introduce assistant
 * configuration / workflow builder functionalities.
 */
export const buildEventsConverter = (): GraphEventConverter => {
  const converters: EventConverter[] = [];

  // main graph converter
  converters.push(getSimpleGraphConverter({ graphName: graphNames.mainAgent }));

  // search agent converter
  converters.push(getSearchAgentGraphConverter({ graphName: graphNames.searchAgent }));

  return function graphEventConverter(event: LangchainEvent): AgentRunEvents[] {
    for (const converter of converters) {
      if (converter.handleEvent(event)) {
        return converter.convert(event);
      }
    }
    return [];
  };
};
