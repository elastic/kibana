/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexItem, EuiText, EuiFlexGroup, EuiTitle, EuiButtonEmpty } from '@elastic/eui';
import { partition } from 'lodash';
import { ActionGroup, getBuiltinActionGroups } from '../../../../../alerting/common';

const BUILT_IN_ACTION_GROUPS: Set<string> = new Set(getBuiltinActionGroups().map(({ id }) => id));

export type ActionGroupWithCondition<
  T,
  ActionGroupIds extends string
> = ActionGroup<ActionGroupIds> &
  (
    | // allow isRequired=false with or without conditions
    {
        conditions?: T;
        isRequired?: false;
      }
    // but if isRequired=true then conditions must be specified
    | {
        conditions: T;
        isRequired: true;
      }
  );

export interface RuleConditionsProps<ConditionProps, ActionGroupIds extends string> {
  headline?: string;
  actionGroups: Array<ActionGroupWithCondition<ConditionProps, ActionGroupIds>>;
  onInitializeConditionsFor?: (
    actionGroup: ActionGroupWithCondition<ConditionProps, ActionGroupIds>
  ) => void;
  onResetConditionsFor?: (
    actionGroup: ActionGroupWithCondition<ConditionProps, ActionGroupIds>
  ) => void;
  includeBuiltInActionGroups?: boolean;
}

export const RuleConditions = <ConditionProps extends any, ActionGroupIds extends string>({
  headline,
  actionGroups,
  onInitializeConditionsFor,
  onResetConditionsFor,
  includeBuiltInActionGroups = false,
  children,
}: PropsWithChildren<RuleConditionsProps<ConditionProps, ActionGroupIds>>) => {
  const [withConditions, withoutConditions] = partition(
    includeBuiltInActionGroups
      ? actionGroups
      : actionGroups.filter(({ id }) => !BUILT_IN_ACTION_GROUPS.has(id)),
    (actionGroup) => actionGroup.hasOwnProperty('conditions')
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiTitle size="s">
          <EuiFlexGroup component="span" alignItems="baseline">
            <EuiFlexItem grow={false}>
              <h6 className="ruleConditions">
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.ruleForm.conditions.title"
                  defaultMessage="Conditions:"
                />
              </h6>
            </EuiFlexItem>
            {headline && (
              <EuiFlexItem>
                <EuiText color="subdued" size="s" data-test-subj="ruleConditionsHeadline">
                  {headline}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="column">
          {withConditions.map((actionGroup) => (
            <EuiFlexItem key={`condition-${actionGroup.id}`}>
              {React.isValidElement(children) &&
                React.cloneElement(
                  React.Children.only(children),
                  onResetConditionsFor
                    ? {
                        actionGroup,
                        onResetConditionsFor,
                      }
                    : { actionGroup }
                )}
            </EuiFlexItem>
          ))}
          {onInitializeConditionsFor && withoutConditions.length > 0 && (
            <EuiFlexItem>
              <EuiFlexGroup direction="row" alignItems="baseline">
                <EuiFlexItem grow={false}>
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.ruleForm.conditions.addConditionLabel"
                    defaultMessage="Add:"
                  />
                </EuiFlexItem>
                {withoutConditions.map((actionGroup) => (
                  <EuiFlexItem key={`condition-add-${actionGroup.id}`} grow={false}>
                    <EuiButtonEmpty
                      flush="left"
                      size="s"
                      onClick={() => onInitializeConditionsFor(actionGroup)}
                    >
                      {actionGroup.name}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleConditions as default };
