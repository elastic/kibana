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
import { getReplaceQueryResourcesPrompt } from './prompts';

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
      const replaceQueryResourcesPrompt = getReplaceQueryResourcesPrompt(state, resources);
      const stringParser = new StringOutputParser();
      query = await model.pipe(stringParser).invoke(replaceQueryResourcesPrompt);
    }
    return { inline_query: query };
  };
};
