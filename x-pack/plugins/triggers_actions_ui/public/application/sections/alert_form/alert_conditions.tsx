/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, PropsWithChildren } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexItem,
  EuiText,
  EuiFlexGroup,
  EuiTitle,
  EuiFormRow,
  EuiButtonIcon,
  EuiButtonEmpty,
} from '@elastic/eui';
import { partition } from 'lodash';
import { ActionGroup } from '../../../../../alerts/common';

export interface ActionGroupWithCondition<T> extends ActionGroup {
  conditions?: T;
}

export interface AlertConditionsProps<ConditionProps> {
  headline?: string;
  actionGroups: Array<ActionGroupWithCondition<ConditionProps>>;
  onInitializeConditionsFor?: (actionGroup: ActionGroupWithCondition<ConditionProps>) => void;
  onResetConditionsFor?: (actionGroup: ActionGroupWithCondition<ConditionProps>) => void;
}

export const AlertConditions = <ConditionProps extends any>({
  headline,
  actionGroups,
  onInitializeConditionsFor,
  onResetConditionsFor,
  children,
}: PropsWithChildren<AlertConditionsProps<ConditionProps>>) => {
  const [withConditions, withoutConditions] = partition(actionGroups, (actionGroup) =>
    actionGroup.hasOwnProperty('conditions')
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
                <EuiText color="subdued" size="s">
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

export type AlertConditionsGroup<ConditionProps> = {
  actionGroup?: ActionGroupWithCondition<ConditionProps>;
} & Pick<AlertConditionsProps<ConditionProps>, 'onResetConditionsFor'>;

export const AlertConditionsGroup = <ConditionProps extends unknown>({
  actionGroup,
  onResetConditionsFor,
  children,
  ...otherProps
}: PropsWithChildren<AlertConditionsGroup<ConditionProps>>) => {
  if (!actionGroup) {
    return null;
  }

  return (
    <EuiFormRow
      label={actionGroup.name}
      fullWidth
      labelAppend={
        onResetConditionsFor && (
          <EuiButtonIcon
            iconType="minusInCircle"
            color="danger"
            aria-label={i18n.translate(
              'xpack.triggersActionsUI.sections.alertAdd.conditions.removeConditionLabel',
              {
                defaultMessage: 'Remove',
              }
            )}
            onClick={() => onResetConditionsFor(actionGroup)}
          />
        )
      }
    >
      {React.isValidElement(children) ? (
        React.cloneElement(React.Children.only(children), {
          actionGroup,
          ...otherProps,
        })
      ) : (
        <Fragment />
      )}
    </EuiFormRow>
  );
};

// eslint-disable-next-line import/no-default-export
export { AlertConditions as default };
