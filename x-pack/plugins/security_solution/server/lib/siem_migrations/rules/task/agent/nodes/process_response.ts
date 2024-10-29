/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIMessage } from '@langchain/core/messages';
import type { GraphNode } from '../types';

export const processResponseNode: GraphNode = async (state) => {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;
  const response = lastMessage.content as string;

  const esqlQuery = response.match(/```esql\n([\s\S]*?)\n```/)?.[1] ?? '';
  const summary = response.match(/## Migration Summary[\s\S]*$/)?.[0] ?? '';

  // if (esqlQuery == null) {
  //   throw new Error('Could not find ESQL query in response');
  // }
  // if (summary == null) {
  //   throw new Error('Could not find migration summary in response');
  // }
  //   const missingEntities = extractMissingEntities(esqlQuery);
  const translationState = getTranslationState(esqlQuery);

  return {
    response,
    comments: [summary],
    translation_state: translationState,
    elastic_rule: {
      title: state.original_rule.title,
      description: state.original_rule.description,
      severity: 'low',
      query: esqlQuery,
      query_language: 'esql',
      // missing_entities: missingEntities,
    },
  };
};

// const extractMissingEntities = (esqlQuery: string) => {
//   const result = Array.from(esqlQuery?.matchAll(/\[macro:[\s\S]+?\]/));
//   console.log(result);
//   return result;
// };

const getTranslationState = (esqlQuery: string) => {
  if (esqlQuery.match(/\[(macro|lookup):[\s\S]*\]/)) {
    return 'partial';
  }
  return 'complete';
};
