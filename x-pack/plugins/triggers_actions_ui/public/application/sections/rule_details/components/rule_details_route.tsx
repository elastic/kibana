/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { ToastsApi } from 'kibana/public';
import { EuiSpacer } from '@elastic/eui';
import { RuleType, ActionType, ResolvedRule } from '../../../../types';
import { RuleDetailsWithApi as RuleDetails } from './rule_details';
import { throwIfAbsent, throwIfIsntContained } from '../../../lib/value_validators';
import {
  ComponentOpts as RuleApis,
  withBulkRuleOperations,
} from '../../common/components/with_bulk_rule_api_operations';
import {
  ComponentOpts as ActionApis,
  withActionOperations,
} from '../../common/components/with_actions_api_operations';
import { useKibana } from '../../../../common/lib/kibana';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';

type RuleDetailsRouteProps = RouteComponentProps<{
  ruleId: string;
}> &
  Pick<ActionApis, 'loadActionTypes'> &
  Pick<RuleApis, 'loadRuleTypes' | 'resolveRule'>;

export const RuleDetailsRoute: React.FunctionComponent<RuleDetailsRouteProps> = ({
  match: {
    params: { ruleId },
  },
  loadRuleTypes,
  loadActionTypes,
  resolveRule,
}) => {
  const {
    http,
    notifications: { toasts },
    spaces: spacesApi,
  } = useKibana().services;

  const { basePath } = http;

  const [rule, setRule] = useState<ResolvedRule | null>(null);
  const [ruleType, setRuleType] = useState<RuleType | null>(null);
  const [actionTypes, setActionTypes] = useState<ActionType[] | null>(null);
  const [refreshToken, requestRefresh] = React.useState<number>();
  useEffect(() => {
    getRuleData(
      ruleId,
      loadRuleTypes,
      resolveRule,
      loadActionTypes,
      setRule,
      setRuleType,
      setActionTypes,
      toasts
    );
  }, [ruleId, http, loadActionTypes, loadRuleTypes, resolveRule, toasts, refreshToken]);

  useEffect(() => {
    if (rule) {
      const outcome = (rule as ResolvedRule).outcome;
      if (spacesApi && outcome === 'aliasMatch') {
        // This rule has been resolved from a legacy URL - redirect the user to the new URL and display a toast.
        const path = basePath.prepend(`insightsAndAlerting/triggersActions/rule/${rule.id}`);
        spacesApi.ui.redirectLegacyUrl({
          path,
          aliasPurpose: (rule as ResolvedRule).alias_purpose,
          objectNoun: i18n.translate(
            'xpack.triggersActionsUI.sections.ruleDetails.redirectObjectNoun',
            { defaultMessage: 'rule' }
          ),
        });
      }
    }
  }, [rule, spacesApi, basePath]);

  const getLegacyUrlConflictCallout = () => {
    const outcome = (rule as ResolvedRule).outcome;
    if (spacesApi && outcome === 'conflict') {
      const aliasTargetId = (rule as ResolvedRule).alias_target_id!; // This is always defined if outcome === 'conflict'
      // We have resolved to one rule, but there is another one with a legacy URL associated with this page. Display a
      // callout with a warning for the user, and provide a way for them to navigate to the other rule.
      const otherRulePath = basePath.prepend(
        `insightsAndAlerting/triggersActions/rule/${aliasTargetId}`
      );
      return (
        <>
          <EuiSpacer />
          {spacesApi.ui.components.getLegacyUrlConflict({
            objectNoun: i18n.translate(
              'xpack.triggersActionsUI.sections.ruleDetails.redirectObjectNoun',
              {
                defaultMessage: 'rule',
              }
            ),
            currentObjectId: rule?.id!,
            otherObjectId: aliasTargetId,
            otherObjectPath: otherRulePath,
          })}
        </>
      );
    }
    return null;
  };

  return rule && ruleType && actionTypes ? (
    <>
      {getLegacyUrlConflictCallout()}
      <RuleDetails
        rule={rule}
        ruleType={ruleType}
        actionTypes={actionTypes}
        requestRefresh={async () => requestRefresh(Date.now())}
        refreshToken={refreshToken}
      />
    </>
  ) : (
    <CenterJustifiedSpinner />
  );
};

export async function getRuleData(
  ruleId: string,
  loadRuleTypes: RuleApis['loadRuleTypes'],
  resolveRule: RuleApis['resolveRule'],
  loadActionTypes: ActionApis['loadActionTypes'],
  setRule: React.Dispatch<React.SetStateAction<ResolvedRule | null>>,
  setRuleType: React.Dispatch<React.SetStateAction<RuleType | null>>,
  setActionTypes: React.Dispatch<React.SetStateAction<ActionType[] | null>>,
  toasts: Pick<ToastsApi, 'addDanger'>
) {
  try {
    const loadedRule: ResolvedRule = await resolveRule(ruleId);
    setRule(loadedRule);

    const [loadedRuleType, loadedActionTypes] = await Promise.all([
      loadRuleTypes()
        .then((types) => types.find((type) => type.id === loadedRule.ruleTypeId))
        .then(throwIfAbsent(`Invalid Rule Type: ${loadedRule.ruleTypeId}`)),
      loadActionTypes().then(
        throwIfIsntContained(
          new Set(loadedRule.actions.map((action) => action.actionTypeId)),
          (requiredActionType: string) => `Invalid Connector Type: ${requiredActionType}`,
          (action: ActionType) => action.id
        )
      ),
    ]);

    setRuleType(loadedRuleType);
    setActionTypes(loadedActionTypes);
  } catch (e) {
    toasts.addDanger({
      title: i18n.translate(
        'xpack.triggersActionsUI.sections.ruleDetails.unableToLoadRuleMessage',
        {
          defaultMessage: 'Unable to load rule: {message}',
          values: {
            message: e.message,
          },
        }
      ),
    });
  }
}

const RuleDetailsRouteWithApi = withActionOperations(withBulkRuleOperations(RuleDetailsRoute));
// eslint-disable-next-line import/no-default-export
export { RuleDetailsRouteWithApi as default };
