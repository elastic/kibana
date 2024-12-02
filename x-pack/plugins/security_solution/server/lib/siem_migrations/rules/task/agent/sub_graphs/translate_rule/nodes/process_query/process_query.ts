/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StringOutputParser } from '@langchain/core/output_parsers';
import { isEmpty } from 'lodash/fp';
import type { ChatModel } from '../../../../../util/actions_client_chat';
import type { RuleResourceRetriever } from '../../../../../util/rule_resource_retriever';
import type { GraphNode } from '../../types';
import { REPLACE_QUERY_RESOURCE_PROMPT, getResourcesContext } from './prompts';

interface GetProcessQueryNodeParams {
  model: ChatModel;
  resourceRetriever: RuleResourceRetriever;
}

export const getProcessQueryNode = ({
  model,
  resourceRetriever,
}: GetProcessQueryNodeParams): GraphNode => {
  return async (state) => {
    let query = state.original_rule.query;
    const resources = await resourceRetriever.getResources(state.original_rule);
    if (!isEmpty(resources)) {
      const replaceQueryParser = new StringOutputParser();
      const replaceQueryResourcePrompt =
        REPLACE_QUERY_RESOURCE_PROMPT.pipe(model).pipe(replaceQueryParser);
      const resourceContext = getResourcesContext(resources);
      const response = await replaceQueryResourcePrompt.invoke({
        query: state.original_rule.query,
        macros: resourceContext.macros,
        lookup_tables: resourceContext.lists,
      });
      const esqlQuery = response.match(/```esql\n([\s\S]*?)\n```/)?.[1] ?? '';
      if (esqlQuery) {
        query = esqlQuery;
      }
    }
    return { inline_query: query };
  };
};
