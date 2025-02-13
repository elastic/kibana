/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoredKnowledgeBaseEntry } from '../tasks/get_knowledge_base_entries';
import { toBlockquote } from './to_blockquote';

export function serializeKnowledgeBaseEntries(entries: ScoredKnowledgeBaseEntry[]) {
  if (!entries.length) {
    return `## Knowledge base
    
    No relevant knowledge base entries were found.
    `;
  }

  const serializedEntries = entries
    .filter((entry) => entry.score >= 3)
    .map(
      (entry) => `## Entry \`${entry.id}\ (score: ${entry.score}, ${
        entry.truncated ? `truncated` : `not truncated`
      })
      
      ${toBlockquote(entry.text)}`
    );

  return `## Knowledge base
  
  The following relevant entries were found in the knowledge base

  ${serializedEntries.join('\n\n')}`;
}
