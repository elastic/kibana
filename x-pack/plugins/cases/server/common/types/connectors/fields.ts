/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface JiraFields {
  issueType: string | null;
  priority: string | null;
  parent: string | null;
}

export interface ResilientFields {
  incidentTypes: string[] | null;
  severityCode: string | null;
}

export interface ServiceNowITSMFields {
  impact: string | null;
  severity: string | null;
  urgency: string | null;
  category: string | null;
  subcategory: string | null;
}

export interface ServiceNowSIRFields {
  category: string | null;
  destIp: boolean | null;
  malwareHash: boolean | null;
  malwareUrl: boolean | null;
  priority: string | null;
  sourceIp: boolean | null;
  subcategory: string | null;
}

export interface SwimlaneFields {
  caseId: string | null;
}
