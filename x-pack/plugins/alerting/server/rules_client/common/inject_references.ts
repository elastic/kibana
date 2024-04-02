/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { omit } from 'lodash';
import { SavedObjectReference, SavedObjectAttributes } from '@kbn/core/server';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';
import { RawRule, RuleTypeParams } from '../../types';
import { RuleActionAttributes } from '../../data/rule/types';
import {
  preconfiguredConnectorActionRefPrefix,
  extractedSavedObjectParamReferenceNamePrefix,
  systemConnectorActionRefPrefix,
} from './constants';

export function injectReferencesIntoActions(
  alertId: string,
  actions: RawRule['actions'] | RuleActionAttributes[],
  references: SavedObjectReference[]
) {
  return actions.map((action) => {
    if (action.actionRef.startsWith(preconfiguredConnectorActionRefPrefix)) {
      return {
        ...omit(action, 'actionRef'),
        id: action.actionRef.replace(preconfiguredConnectorActionRefPrefix, ''),
      };
    }

    if (action.actionRef.startsWith(systemConnectorActionRefPrefix)) {
      return {
        ...omit(action, 'actionRef'),
        id: action.actionRef.replace(systemConnectorActionRefPrefix, ''),
      };
    }

    const reference = references.find((ref) => ref.name === action.actionRef);
    if (!reference) {
      throw new Error(`Action reference "${action.actionRef}" not found in alert id: ${alertId}`);
    }
    return {
      ...omit(action, 'actionRef'),
      id: reference.id,
    };
  });
}

export function injectReferencesIntoParams<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams
>(
  ruleId: string,
  ruleType: UntypedNormalizedRuleType,
  ruleParams: SavedObjectAttributes | undefined,
  references: SavedObjectReference[]
): Params {
  try {
    const paramReferences = references
      .filter((reference: SavedObjectReference) =>
        reference.name.startsWith(extractedSavedObjectParamReferenceNamePrefix)
      )
      .map((reference: SavedObjectReference) => ({
        ...reference,
        name: reference.name.replace(extractedSavedObjectParamReferenceNamePrefix, ''),
      }));
    return ruleParams && ruleType?.useSavedObjectReferences?.injectReferences
      ? (ruleType.useSavedObjectReferences.injectReferences(
          ruleParams as ExtractedParams,
          paramReferences
        ) as Params)
      : (ruleParams as Params);
  } catch (err) {
    throw Boom.badRequest(
      `Error injecting reference into rule params for rule id ${ruleId} - ${err.message}`
    );
  }
}
