/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AttackDiscovery {
  alertIds: string[];
  detailsMarkdown: string;
  entitySummaryMarkdown: string;
  id: string;
  mitreAttackTactics?: string[];
  summaryMarkdown: string;
  title: string;
}

/** Generation intervals measure the time it takes to generate attack discoveries */
export interface GenerationInterval {
  connectorId: string;
  date: Date;
  durationMs: number;
}
