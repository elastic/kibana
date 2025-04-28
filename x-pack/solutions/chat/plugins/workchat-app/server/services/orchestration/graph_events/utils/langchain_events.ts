/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamEvent as LangchainEvent } from '@langchain/core/tracers/log_stream';

/**
 * Checks if the given event was sent from the given graph
 * @param event
 * @param graphName
 */
export const matchGraphName = (event: LangchainEvent, graphName: string): boolean => {
  return event.metadata.graphName === graphName;
};
