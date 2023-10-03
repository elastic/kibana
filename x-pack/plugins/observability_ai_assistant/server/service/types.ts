/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ObservabilityAIAssistantResourceNames {
  componentTemplate: {
    conversations: string;
    kb: string;
  };
  indexTemplate: {
    conversations: string;
    kb: string;
  };
  ilmPolicy: {
    conversations: string;
  };
  aliases: {
    conversations: string;
    kb: string;
  };
  indexPatterns: {
    conversations: string;
    kb: string;
  };
  pipelines: {
    kb: string;
  };
}
