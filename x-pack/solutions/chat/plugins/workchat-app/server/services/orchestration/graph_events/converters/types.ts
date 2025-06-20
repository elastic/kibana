/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamEvent as LangchainEvent } from '@langchain/core/tracers/log_stream';
import { AgentRunEvents } from '../../types';

/**
 * Event converter, in charge of transforming langgraph run events
 * into the corresponding agent events.
 */
export interface EventConverter {
  /**
   * Checks if the converter should handle a particular event.
   */
  handleEvent: (event: LangchainEvent) => boolean;
  /**
   * Converts the given graph event into its corresponding run events.
   * A langchain event can map to zero, one, or many run events.
   */
  convert: (event: LangchainEvent) => AgentRunEvents[];
}
