/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FromSchema } from 'json-schema-to-ts';
import { FunctionVisibility } from '../types';

export enum VisualizeESQLUserIntention {
  generateQueryOnly = 'generateQueryOnly',
  executeAndReturnResults = 'executeAndReturnResults',
  visualizeAuto = 'visualizeAuto',
  visualizeXy = 'visualizeXy',
  visualizeBar = 'visualizeBar',
  visualizeLine = 'visualizeLine',
  visualizeDonut = 'visualizeDonut',
  visualizeTreemap = 'visualizeTreemap',
  visualizeHeatmap = 'visualizeHeatmap',
  visualizeTagcloud = 'visualizeTagcloud',
  visualizeWaffle = 'visualizeWaffle',
}

export const VISUALIZE_ESQL_USER_INTENTIONS: VisualizeESQLUserIntention[] = Object.values(
  VisualizeESQLUserIntention
);

export const visualizeESQLFunction = {
  name: 'visualize_query',
  visibility: FunctionVisibility.UserOnly,
  description: 'Use this function to visualize charts for ES|QL queries.',
  descriptionForUser: 'Use this function to visualize charts for ES|QL queries.',
  parameters: {
    type: 'object',
    additionalProperties: true,
    properties: {
      query: {
        type: 'string',
      },
      intention: {
        type: 'string',
        enum: VISUALIZE_ESQL_USER_INTENTIONS,
      },
    },
    required: ['query', 'intention'],
  } as const,
  contexts: ['core'],
};

export type VisualizeESQLFunctionArguments = FromSchema<typeof visualizeESQLFunction['parameters']>;
