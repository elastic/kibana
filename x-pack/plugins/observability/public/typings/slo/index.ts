/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface SLO {
  id: string;
  name: string;
  objective: {
    target: number;
  };
  summary: {
    sliValue: number;
    errorBudget: {
      remaining: number;
    };
  };
}

interface SLOList {
  results: SLO[];
  page: number;
  perPage: number;
  total: number;
}

export type { SLO, SLOList };
