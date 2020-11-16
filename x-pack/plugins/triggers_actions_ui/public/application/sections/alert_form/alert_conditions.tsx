/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { PropsWithChildren } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexItem, EuiText, EuiFlexGroup, EuiTitle, EuiButtonEmpty } from '@elastic/eui';
import { partition } from 'lodash';
import { ActionGroup, getBuiltinActionGroups } from '../../../../../alerts/common';

const BUILT_IN_ACTION_GROUPS: Set<string> = new Set(getBuiltinActionGroups().map(({ id }) => id));

export type ActionGroupWithCondition<T> = ActionGroup &
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

export interface AlertConditionsProps<ConditionProps> {
  headline?: string;
  actionGroups: Array<ActionGroupWithCondition<ConditionProps>>;
  onInitializeConditionsFor?: (actionGroup: ActionGroupWithCondition<ConditionProps>) => void;
  onResetConditionsFor?: (actionGroup: ActionGroupWithCondition<ConditionProps>) => void;
  includeBuiltInActionGroups?: boolean;
}

export const AlertConditions = <ConditionProps extends any>({
  headline,
  actionGroups,
  onInitializeConditionsFor,
  onResetConditionsFor,
  includeBuiltInActionGroups = false,
  children,
}: PropsWithChildren<AlertConditionsProps<ConditionProps>>) => {
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
                  id="xpack.triggersActionsUI.sections.alertAdd.conditions.title"
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
                    id="xpack.triggersActionsUI.sections.alertAdd.conditions.addConditionLabel"
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
