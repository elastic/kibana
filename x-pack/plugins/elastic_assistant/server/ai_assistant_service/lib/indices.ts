/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const elasticAssistantBaseIndexName = 'elastic-assistant';

export const allAssistantIndexPattern = '.ds-elastic-assistant*';

export const latestAssistantIndexPattern = 'elastic-assistant.elastic-assistant-latest-*';

export const getAssistantLatestIndex = (spaceId = 'default') =>
  `${elasticAssistantBaseIndexName}.elastic-assistant-latest-${spaceId}`;
