/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EditorError } from '@kbn/esql-ast';
import { isEmpty } from 'lodash/fp';
import type { GraphNode } from '../../types';
import { parseEsqlQuery } from './esql_query';

interface GetValidationNodeParams {
  logger: Logger;
}

/**
 * This node runs all validation steps, and will redirect to the END of the graph if no errors are found.
 * Any new validation steps should be added here.
 */
export const getValidationNode = ({ logger }: GetValidationNodeParams): GraphNode => {
  return async (state) => {
    const query = state.elastic_rule.query;

    // We want to prevent infinite loops, so we increment the iterations counter for each validation run.
    const currentIteration = state.validation_errors.iterations++;
    let esqlErrors: EditorError[] = [];
    if (!isEmpty(query)) {
      esqlErrors = parseEsqlQuery(query);
      if (!isEmpty(esqlErrors)) {
        logger.debug(`Esql validation errors: ${JSON.stringify(esqlErrors)}`);
      }
    }

    return { validation_errors: { iterations: currentIteration, esql_errors: esqlErrors } };
  };
};
