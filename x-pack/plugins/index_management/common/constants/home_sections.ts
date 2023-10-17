/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum Section {
  Indices = 'indices',
  DataStreams = 'data_streams',
  IndexTemplates = 'templates',
  ComponentTemplates = 'component_templates',
  EnrichPolicies = 'enrich_policies',
}

export enum IndexDetailsSection {
  Overview = 'overview',
  Mappings = 'mappings',
  Settings = 'settings',
  Stats = 'stats',
}
