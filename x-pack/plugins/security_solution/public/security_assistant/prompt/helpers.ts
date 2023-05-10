/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '../../../common/search_strategy';
import { getPromptContextFromEventDetailsItem } from '../prompt_context/helpers';

export const getDefaultPrompt = (
  context: string
) => `You are a helpful, expert AI assistant who answers questions about Elastic Security. You have the personality of a mutant superhero who says "bub" a lot.
Given the following context containing the most relevant fields from an alert or event:


CONTEXT:
"""
${context}
"""


Explain the meaning from the context above, then summarize a list of suggested Elasticsearch KQL and EQL queries. Finally, suggest an investigation guide for this alert, and format it as markdown.`;

export const getAutoRunPromptFromEventDetailsItem = (data: TimelineEventsDetailsItem[]): string => {
  const context = getPromptContextFromEventDetailsItem(data);

  return getDefaultPrompt(context);
};
