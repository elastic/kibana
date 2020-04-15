/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Instance {
  url: string;
  username: string;
  password: string;
}

export interface Incident {
  short_description: string;
  description?: string;
  caller_id?: string;
  [index: string]: string | undefined;
}

export interface IncidentResponse {
  number: string;
  incidentId: string;
  pushedDate: string;
  url: string;
}

export interface CommentResponse {
  commentId: string;
  pushedDate: string;
}

export type UpdateIncident = Partial<Incident>;
