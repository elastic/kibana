/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type DataSourceType = string;

export type DataSourceCategory = 'index_based' | 'federated';

export interface DataSourceUIConfig {
  // Path to the UI component (will be resolved by the frontend)
  componentPath?: string;
  // Any additional props to pass to the UI component
  componentProps?: Record<string, any>;
}

export interface DataSourceDefinition {
  type: DataSourceType;
  category: DataSourceCategory; // Whether it's index-based or federated
  provider: string; // e.g. 'connectors' for grouping similar integration types
  name: string;
  description: string;
  iconPath?: string; // Path to the connector icon
  tags?: string[]; // List of tags for categorization and search
  // UI configuration for custom flows
  uiConfig?: DataSourceUIConfig;
}
