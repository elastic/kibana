/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAttributes } from '../../../data/rule/types';
import {
  NormalizedAlertActionWithGeneratedValues,
  RulesClientContext,
} from '../../../rules_client';
import { denormalizeActions } from '../../../rules_client/lib/denormalize_actions';

interface Args {
  actions: NormalizedAlertActionWithGeneratedValues[];
  context: RulesClientContext;
}

export const transformDomainActionsToRawActions = async ({
  actions,
  context,
}: Args): Promise<RuleAttributes['actions']> => {
  const { actions: actionsWithExtractedRefs } = await denormalizeActions(context, actions);

  const actionsWithoutType = actionsWithExtractedRefs.map((action) => {
    const { type, ...restAction } = action;

    return restAction;
  });

  return actionsWithoutType;
};
