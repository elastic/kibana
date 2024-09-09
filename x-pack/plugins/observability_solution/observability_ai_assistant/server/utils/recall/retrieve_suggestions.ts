/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { ObservabilityAIAssistantClient } from '../../service/client';
import { RetrievedSuggestion } from './types';

export async function retrieveSuggestions({
  queries,
  recall,
}: {
  queries: Array<{ text: string; boost?: number }>;
  recall: ObservabilityAIAssistantClient['recall'];
}): Promise<RetrievedSuggestion[]> {
  const recallResponse = await recall({
    queries,
  });

  return recallResponse.entries.map((entry) => omit(entry, 'labels', 'is_correction'));
}
