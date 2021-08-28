/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { partition } from 'lodash';
import type { PropsWithChildren } from 'react';
import React from 'react';
import type { ActionGroup } from '../../../../../alerting/common/alert_type';
import { getBuiltinActionGroups } from '../../../../../alerting/common/builtin_action_groups';

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

export interface AlertConditionsProps<ConditionProps, ActionGroupIds extends string> {
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

export const AlertConditions = <ConditionProps extends any, ActionGroupIds extends string>({
  headline,
  actionGroups,
  onInitializeConditionsFor,
  onResetConditionsFor,
  includeBuiltInActionGroups = false,
  children,
}: PropsWithChildren<AlertConditionsProps<ConditionProps, ActionGroupIds>>) => {
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
              <h6 className="alertConditions">
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.alertForm.conditions.title"
                  defaultMessage="Conditions:"
                />
              </h6>
            </EuiFlexItem>
            {headline && (
              <EuiFlexItem>
                <EuiText color="subdued" size="s" data-test-subj="alertConditionsHeadline">
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
                    id="xpack.triggersActionsUI.sections.alertForm.conditions.addConditionLabel"
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
export { AlertConditions as default };
