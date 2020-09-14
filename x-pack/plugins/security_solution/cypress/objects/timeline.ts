/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Timeline {
  title: string;
  description: string;
  query: string;
  id?: string;
}

export const SIEM_TIMELINE_ID = '0162c130-78be-11ea-9718-118a926974a4';
