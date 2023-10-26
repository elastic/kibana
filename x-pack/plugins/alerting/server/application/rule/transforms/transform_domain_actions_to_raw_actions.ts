/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAttributes } from '../../../data/rule/types';
import { DenormalizedAction } from '../../../rules_client';

interface Args {
  actions: DenormalizedAction[];
}

export const transformDomainActionsToRawActions = ({ actions }: Args): RuleAttributes['actions'] =>
  actions.map(({ type, ...restAction }) => restAction);
