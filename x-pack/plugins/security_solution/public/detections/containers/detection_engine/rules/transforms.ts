/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flow } from 'fp-ts/lib/function';
import { addIdToItem, removeIdFromItem } from '@kbn/securitysolution-utils';
import type {
  CreateRulesSchema,
  UpdateRulesSchema,
} from '../../../../../common/detection_engine/schemas/request';
import type { Rule } from '../../../../detection_engine/rule_management/logic/types';

// These are a collection of transforms that are UI specific and useful for UI concerns
// that are inserted between the API and the actual user interface. In some ways these
// might be viewed as technical debt or to compensate for the differences and preferences
// of how ReactJS might prefer data vs. how we want to model data. Each function should have
// a description giving context around the transform.

/**
 * Transforms the output of rules to compensate for technical debt or UI concerns such as
 * ReactJS preferences for having ids within arrays if the data is not modeled that way.
 *
 * If you add a new transform of the output called "myNewTransform" do it
 * in the form of:
 * flow(removeIdFromThreatMatchArray, myNewTransform)(rule)
 *
 * @param rule The rule to transform the output of
 * @returns The rule transformed from the output
 */
export const transformOutput = (
  rule: CreateRulesSchema | UpdateRulesSchema
): CreateRulesSchema | UpdateRulesSchema => flow(removeIdFromThreatMatchArray)(rule);

/**
 * Transforms the output of rules to compensate for technical debt or UI concerns such as
 * ReactJS preferences for having ids within arrays if the data is not modeled that way.
 *
 * If you add a new transform of the input called "myNewTransform" do it
 * in the form of:
 * flow(addIdToThreatMatchArray, myNewTransform)(rule)
 *
 * @param rule The rule to transform the output of
 * @returns The rule transformed from the output
 */
export const transformInput = (rule: Rule): Rule => flow(addIdToThreatMatchArray)(rule);

/**
 * This adds an id to the incoming threat match arrays as ReactJS prefers to have
 * an id added to them for use as a stable id. Later if we decide to change the data
 * model to have id's within the array then this code should be removed. If not, then
 * this code should stay as an adapter for ReactJS.
 *
 * This does break the type system slightly as we are lying a bit to the type system as we return
 * the same rule as we have previously but are augmenting the arrays with an id which TypeScript
 * doesn't mind us doing here. However, downstream you will notice that you have an id when the type
 * does not indicate it. In that case just cast this temporarily if you're using the id. If you're not,
 * you can ignore the id and just use the normal TypeScript with ReactJS.
 *
 * @param rule The rule to add an id to the threat matches.
 * @returns rule The rule but with id added to the threat array and entries
 */
export const addIdToThreatMatchArray = (rule: Rule): Rule => {
  if (rule.type === 'threat_match' && rule.threat_mapping != null) {
    const threatMapWithId = rule.threat_mapping.map((mapping) => {
      const newEntries = mapping.entries.map((entry) => addIdToItem(entry));
      return addIdToItem({ entries: newEntries });
    });
    return { ...rule, threat_mapping: threatMapWithId };
  } else {
    return rule;
  }
};

/**
 * This removes an id from the threat match arrays as ReactJS prefers to have
 * an id added to them for use as a stable id. Later if we decide to change the data
 * model to have id's within the array then this code should be removed. If not, then
 * this code should stay as an adapter for ReactJS.
 *
 * @param rule The rule to remove an id from the threat matches.
 * @returns rule The rule but with id removed from the threat array and entries
 */
export const removeIdFromThreatMatchArray = (
  rule: CreateRulesSchema | UpdateRulesSchema
): CreateRulesSchema | UpdateRulesSchema => {
  if (rule.type === 'threat_match' && rule.threat_mapping != null) {
    const threatMapWithoutId = rule.threat_mapping.map((mapping) => {
      const newEntries = mapping.entries.map((entry) => removeIdFromItem(entry));
      const newMapping = removeIdFromItem(mapping);
      return { ...newMapping, entries: newEntries };
    });
    return { ...rule, threat_mapping: threatMapWithoutId };
  } else {
    return rule;
  }
};
