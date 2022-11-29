/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from '@kbn/core/server';
import { RawRule, RuleTypeParams } from '../../types';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';
import { NormalizedAlertAction } from '../types';
import { extractedSavedObjectParamReferenceNamePrefix } from '../common/constants';
import { RulesClientContext } from '../types';
import { denormalizeActions } from './denormalize_actions';

export async function extractReferences<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams
>(
  context: RulesClientContext,
  ruleType: UntypedNormalizedRuleType,
  ruleActions: NormalizedAlertAction[],
  ruleParams: Params
): Promise<{
  actions: RawRule['actions'];
  params: ExtractedParams;
  references: SavedObjectReference[];
}> {
  const { references: actionReferences, actions } = await denormalizeActions(context, ruleActions);

  // Extracts any references using configured reference extractor if available
  const extractedRefsAndParams = ruleType?.useSavedObjectReferences?.extractReferences
    ? ruleType.useSavedObjectReferences.extractReferences(ruleParams)
    : null;
  const extractedReferences = extractedRefsAndParams?.references ?? [];
  const params = (extractedRefsAndParams?.params as ExtractedParams) ?? ruleParams;

  // Prefix extracted references in order to avoid clashes with framework level references
  const paramReferences = extractedReferences.map((reference: SavedObjectReference) => ({
    ...reference,
    name: `${extractedSavedObjectParamReferenceNamePrefix}${reference.name}`,
  }));

  const references = [...actionReferences, ...paramReferences];

  return {
    actions,
    params,
    references,
  };
}
