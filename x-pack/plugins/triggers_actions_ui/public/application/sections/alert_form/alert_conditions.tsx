/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { PropsWithChildren } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexItem, EuiFlexGroup, EuiTitle } from '@elastic/eui';
import { ActionGroup } from '../../../../../alerts/common';

export interface ActionGroupWithCondition<T> extends ActionGroup {
  conditions?: T;
}

interface AlertConditionsProps<ConditionProps> {
  headline?: string;
  actionGroups: Array<ActionGroupWithCondition<ConditionProps>>;
  //   getActionGroupComponent: (actionGroup: ActionGroupWithCondition<ConditionProps>) => ReactElement;
}

export const AlertConditions = <ConditionProps extends any>({
  headline,
  actionGroups,
  children,
}: PropsWithChildren<AlertConditionsProps<ConditionProps>>) => {
  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertAdd.conditions.title"
                defaultMessage="Conditions:"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        {headline && <EuiFlexItem>{headline}</EuiFlexItem>}
      </EuiFlexGroup>
      <EuiFlexGroup>
        {actionGroups
          .filter((actionGroup) => !!actionGroup.conditions)
          .map((actionGroup) => (
            <EuiFlexItem key={`condition-${actionGroup.id}`}>
              {React.isValidElement(children) &&
                React.cloneElement(React.Children.only(children), {
                  actionGroup,
                })}
            </EuiFlexItem>
          ))}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
