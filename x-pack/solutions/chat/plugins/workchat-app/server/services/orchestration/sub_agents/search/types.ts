/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentRef } from '@kbn/wci-common';

/**
 * Output of the search agent
 */
export interface SearchAgentOutput {
  /**
   * Relevant content and knowledge that was retrieved by the agent
   */
  summary: string;
  /**
   * References to the documents that were used to generate that summary
   */
  citations: ContentRef[];
}
