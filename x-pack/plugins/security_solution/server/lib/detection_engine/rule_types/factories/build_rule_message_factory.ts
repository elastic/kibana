/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type BuildRuleMessage = (...messages: string[]) => string;
export interface BuildRuleMessageFactoryParams {
  executionId: string;
  name: string;
  id: string;
  ruleId: string | null | undefined;
  index: string;
}

// TODO: change `index` param to `spaceId`
export const buildRuleMessageFactory =
  ({ executionId, id, ruleId, index, name }: BuildRuleMessageFactoryParams): BuildRuleMessage =>
  (...messages) =>
    [
      ...messages,
      `name: "${name}"`,
      `id: "${id}"`,
      `rule id: "${ruleId ?? '(unknown rule id)'}"`,
      `execution id: "${executionId}"`,
      `space ID: "${index}"`,
    ].join(' ');
