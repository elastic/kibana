/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ResilientSettingFields {
  incidentTypes: number[];
  severityCode: number;
}

export type ResilientIncidentTypes = Array<{ id: number; name: string }>;
export type ResilientSeverity = ResilientIncidentTypes;
