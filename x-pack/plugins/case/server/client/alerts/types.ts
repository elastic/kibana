/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Alert {
  id: string;
  index: string;
  destination?: {
    ip: string;
  };
  source?: {
    ip: string;
  };
}

export type CaseClientGetAlertsResponse = Alert[];
