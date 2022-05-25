/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface SourceActivity {
  details: string[];
  event: string;
  time: string;
  status: string;
}

export interface ContentSource {
  id: string;
  serviceType: string;
  baseServiceType?: string;
  name: string;
}

export interface ContentSourceDetails extends ContentSource {
  status: string;
  statusMessage: string;
  documentCount: string;
  isFederatedSource: boolean;
  searchable: boolean;
  supportedByLicense: boolean;
  errorReason: string | null;
  allowsReauth: boolean;
  boost: number;
  activities: SourceActivity[];
  isOauth1: boolean;
  altIcon?: string; // base64 encoded png
  mainIcon?: string; // base64 encoded png
}
