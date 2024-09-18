/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { AlertConsumers } from '@kbn/rule-data-utils';
import type { SavedObjectReference } from '@kbn/core/server';
import type { RulesClientContext } from '../..';
import { RawRuleAction, RawRule } from '../../../types';
import { validateActions } from '../validate_actions';
import { retrieveMigratedLegacyActions } from './retrieve_migrated_legacy_actions';
import { transformRawActionsToDomainActions } from '../../../application/rule/transforms/transform_raw_actions_to_domain_actions';

type MigrateLegacyActions = (
  context: RulesClientContext,
  params: {
    ruleId: string;
    references?: SavedObjectReference[];
    actions?: RawRuleAction[];
    attributes: RawRule;
    skipActionsValidation?: boolean;
  }
) => Promise<{
  resultedActions: RawRuleAction[];
  resultedReferences: SavedObjectReference[];
  hasLegacyActions: boolean;
}>;

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * migrates SIEM legacy actions and merges rule actions and references
 * @param context RulesClient context
 * @param params
 * @returns
 */
export const migrateLegacyActions: MigrateLegacyActions = async (
  context: RulesClientContext,
  { ruleId, actions = [], references = [], attributes, skipActionsValidation }
) => {
  try {
    if (attributes.consumer !== AlertConsumers.SIEM) {
      return {
        resultedActions: [],
        hasLegacyActions: false,
        resultedReferences: [],
      };
    }

    const validateLegacyActions = async (
      legacyActions: RawRuleAction[],
      legacyActionsReferences: SavedObjectReference[]
    ) => {
      // sometimes we don't need to validate legacy actions. For example, when delete rules or update rule from payload
      if (skipActionsValidation === true) {
        return;
      }
      const ruleType = context.ruleTypeRegistry.get(attributes.alertTypeId);
      await validateActions(context, ruleType, {
        ...attributes,
        // set to undefined to avoid both per-actin and rule level values clashing
        throttle: undefined,
        notifyWhen: undefined,
        actions: transformRawActionsToDomainActions({
          ruleId,
          actions: legacyActions,
          references: legacyActionsReferences,
          isSystemAction: context.isSystemAction,
        }),
      });
    };

    const { legacyActions, legacyActionsReferences } = await retrieveMigratedLegacyActions(
      context,
      {
        ruleId,
      },
      validateLegacyActions
    );

    // fix references for a case when actions present in a rule
    if (actions.length) {
      legacyActions.forEach((legacyAction, i) => {
        const oldReference = legacyAction.actionRef;
        const legacyReference = legacyActionsReferences.find(({ name }) => name === oldReference);
        const newReference = `action_${actions.length + i}`;
        legacyAction.actionRef = newReference;

        if (legacyReference) {
          legacyReference.name = newReference;
        }
      });
    }

    // put frequencies into existing actions
    // the situation when both action in rule nad legacy exist should be rare one
    // but if it happens, we put frequency in existing actions per-action level
    const existingActionsWithFrequencies: RawRuleAction[] = actions.map((action) => ({
      ...action,
      frequency: {
        summary: true,
        notifyWhen: attributes.notifyWhen ?? 'onActiveAlert',
        throttle: attributes.throttle ?? null,
      },
    }));

    return {
      resultedActions: [...existingActionsWithFrequencies, ...legacyActions],
      hasLegacyActions: legacyActions.length > 0,
      resultedReferences: [...references, ...legacyActionsReferences],
    };
  } catch (e) {
    context.logger.error(
      `migrateLegacyActions(): Failed to migrate legacy actions for SIEM rule ${ruleId}: ${e.message}`
    );
    throw Boom.badRequest(
      i18n.translate('xpack.alerting.rulesClient.validateLegacyActions.errorSummary', {
        defaultMessage: 'Failed to migrate legacy actions for SIEM rule {ruleId}: {errorMessage}',
        values: {
          ruleId,
          errorMessage: e.message,
        },
      })
    );
  }
};
