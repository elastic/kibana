/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiAccordion,
  EuiText,
  EuiErrorBoundary,
  EuiBetaBadge,
  EuiSplitPanel,
} from '@elastic/eui';
import { partition } from 'lodash';
import { ActionVariable, RuleActionParam } from '@kbn/alerting-plugin/common';
import { betaBadgeProps } from './beta_badge_props';
import {
  IErrorObject,
  RuleAction,
  ActionTypeIndex,
  ActionConnector,
  ActionVariables,
  ActionTypeRegistryContract,
  ActionConnectorMode,
} from '../../../types';
import { checkActionFormActionTypeEnabled } from '../../lib/check_action_type_enabled';
import { ActionAccordionFormProps, ActionGroupWithMessageVariables } from './action_form';
import { transformActionVariables } from '../../lib/action_variables';

export type ActionTypePreviewProps = {
  actionItem: RuleAction;
  actionConnector: ActionConnector;
  index: number;
  actionTypesIndex: ActionTypeIndex;
  connectors: ActionConnector[];
  actionTypeRegistry: ActionTypeRegistryContract;
} & Pick<
  ActionAccordionFormProps,
  | 'actionGroups'
  | 'messageVariables'
  | 'summaryMessageVariables'
  | 'defaultActionMessage'
  | 'defaultSummaryMessage'
>;

const preconfiguredMessage = i18n.translate(
  'xpack.triggersActionsUI.sections.actionForm.preconfiguredTitleMessage',
  {
    defaultMessage: '(preconfigured)',
  }
);

export const ActionTypePreview = ({
  actionItem,
  actionConnector,
  index,
  actionTypesIndex,
  connectors,
  defaultActionMessage,
  messageVariables,
  summaryMessageVariables,
  actionGroups,
  actionTypeRegistry,
  defaultSummaryMessage,
}: ActionTypePreviewProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [availableActionVariables, setAvailableActionVariables] = useState<ActionVariable[]>([]);
  const selectedActionGroup = actionGroups?.find(({ id }) => id === actionItem.group);
  const [actionParamsErrors, setActionParamsErrors] = useState<{ errors: IErrorObject }>({
    errors: {},
  });

  const [useDefaultMessage, _] = useState(false);

  const isSummaryAction = actionItem.frequency?.summary;

  useEffect(() => {
    (async () => {
      setAvailableActionVariables(
        messageVariables
          ? getAvailableActionVariables(
              messageVariables,
              summaryMessageVariables,
              selectedActionGroup,
              isSummaryAction
            )
          : []
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionItem.group, actionItem.frequency?.summary]);

  useEffect(() => {
    (async () => {
      const res: { errors: IErrorObject } = await actionTypeRegistry
        .get(actionItem.actionTypeId)
        ?.validateParams(actionItem.params);
      setActionParamsErrors(res);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionItem]);

  const actionTypeRegistered = actionTypeRegistry.get(actionConnector.actionTypeId);
  if (!actionTypeRegistered) return null;

  const ParamsFieldsComponent = actionTypeRegistered.actionParamsFields;
  const checkEnabledResult = checkActionFormActionTypeEnabled(
    actionTypesIndex[actionConnector.actionTypeId],
    connectors.filter((connector) => connector.isPreconfigured)
  );

  const accordionContent = checkEnabledResult.isEnabled ? (
    <>
      <EuiSplitPanel.Inner color="plain">
        {ParamsFieldsComponent ? (
          <EuiErrorBoundary>
            <Suspense fallback={null}>
              <ParamsFieldsComponent
                actionParams={actionItem.params as any}
                index={index}
                errors={actionParamsErrors.errors}
                editAction={(key: string, value: RuleActionParam, i: number) => {}}
                messageVariables={availableActionVariables}
                defaultMessage={
                  // if action is a summary action, show the default summary message
                  isSummaryAction
                    ? defaultSummaryMessage
                    : selectedActionGroup?.defaultActionMessage ?? defaultActionMessage
                }
                useDefaultMessage={useDefaultMessage}
                actionConnector={actionConnector}
                executionMode={ActionConnectorMode.ActionForm}
              />
            </Suspense>
          </EuiErrorBoundary>
        ) : null}
      </EuiSplitPanel.Inner>
    </>
  ) : (
    checkEnabledResult.messageCard
  );

  return (
    <>
      <EuiSplitPanel.Outer hasShadow={isOpen}>
        <EuiAccordion
          initialIsOpen={true}
          key={index}
          id={index.toString()}
          onToggle={setIsOpen}
          paddingSize="none"
          className="actAccordionActionForm"
          buttonContentClassName="actAccordionActionForm__button"
          data-test-subj={`alertActionAccordion-${index}`}
          buttonContent={
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type={actionTypeRegistered.iconClass} size="m" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText>
                  <div>
                    <EuiFlexGroup gutterSize="s" alignItems="center">
                      <EuiFlexItem grow={false}>
                        <FormattedMessage
                          defaultMessage="{actionConnectorName}"
                          id="xpack.triggersActionsUI.sections.actionTypeForm.existingAlertActionTypeEditTitle"
                          values={{
                            actionConnectorName: `${actionConnector.name} ${
                              actionConnector.isPreconfigured ? preconfiguredMessage : ''
                            }`,
                          }}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </div>
                </EuiText>
              </EuiFlexItem>
              {actionTypeRegistered && actionTypeRegistered.isExperimental && (
                <EuiFlexItem grow={false}>
                  <EuiBetaBadge
                    data-test-subj="action-type-form-beta-badge"
                    label={betaBadgeProps.label}
                    tooltipContent={betaBadgeProps.tooltipContent}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          }
        >
          {accordionContent}
        </EuiAccordion>
      </EuiSplitPanel.Outer>
      <EuiSpacer size="l" />
    </>
  );
};

function getAvailableActionVariables(
  actionVariables: ActionVariables,
  summaryActionVariables?: ActionVariables,
  actionGroup?: ActionGroupWithMessageVariables,
  isSummaryAction?: boolean
) {
  const transformedActionVariables: ActionVariable[] = transformActionVariables(
    actionVariables,
    summaryActionVariables,
    actionGroup?.omitMessageVariables,
    isSummaryAction
  );

  // partition deprecated items so they show up last
  const partitionedActionVariables = partition(
    transformedActionVariables,
    (v) => v.deprecated !== true
  );
  return partitionedActionVariables.reduce((acc, curr) => {
    return [
      ...acc,
      ...curr.sort((a, b) => a.name.toUpperCase().localeCompare(b.name.toUpperCase())),
    ];
  }, []);
}
