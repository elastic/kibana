/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type BuildRuleMessage = (...messages: string[]) => string;
export interface BuildRuleMessageFactoryParams {
  name: string;
  id: string;
  ruleId: string | null | undefined;
  index: string;
}

export const buildRuleMessageFactory = ({
  id,
  ruleId,
  index,
  name,
}: BuildRuleMessageFactoryParams): BuildRuleMessage => (...messages) =>
  [
    ...messages,
    `name: "${name}"`,
    `id: "${id}"`,
    `rule id: "${ruleId ?? '(unknown rule id)'}"`,
    `signals index: "${index}"`,
  ].join(' ');
