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
  EuiFormRow,
  EuiAccordion,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiIconTip,
  EuiText,
  EuiFormLabel,
  EuiSuperSelect,
  EuiBadge,
  EuiErrorBoundary,
} from '@elastic/eui';
import { partition } from 'lodash';
import { ActionVariable, RuleActionParam } from '@kbn/alerting-plugin/common';
import {
  IErrorObject,
  RuleAction,
  ActionTypeIndex,
  ActionConnector,
  ActionVariables,
  ActionTypeRegistryContract,
} from '../../../types';
import { checkActionFormActionTypeEnabled } from '../../lib/check_action_type_enabled';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { ActionAccordionFormProps, ActionGroupWithMessageVariables } from './action_form';
import { transformActionVariables } from '../../lib/action_variables';
import { useKibana } from '../../../common/lib/kibana';
import { DefaultActionParams } from '../../lib/get_defaults_for_action_params';
import { ConnectorsSelection } from './connectors_selection';

export type ActionTypeFormProps = {
  actionItem: RuleAction;
  actionConnector: ActionConnector;
  index: number;
  onAddConnector: () => void;
  onConnectorSelected: (id: string) => void;
  onDeleteAction: () => void;
  setActionParamsProperty: (key: string, value: RuleActionParam, index: number) => void;
  actionTypesIndex: ActionTypeIndex;
  connectors: ActionConnector[];
  actionTypeRegistry: ActionTypeRegistryContract;
  defaultParams: DefaultActionParams;
  isActionGroupDisabledForActionType?: (actionGroupId: string, actionTypeId: string) => boolean;
} & Pick<
  ActionAccordionFormProps,
  | 'defaultActionGroupId'
  | 'actionGroups'
  | 'setActionGroupIdByIndex'
  | 'setActionParamsProperty'
  | 'messageVariables'
  | 'defaultActionMessage'
>;

const preconfiguredMessage = i18n.translate(
  'xpack.triggersActionsUI.sections.actionForm.preconfiguredTitleMessage',
  {
    defaultMessage: '(preconfigured)',
  }
);

export const ActionTypeForm = ({
  actionItem,
  actionConnector,
  index,
  onAddConnector,
  onConnectorSelected,
  onDeleteAction,
  setActionParamsProperty,
  actionTypesIndex,
  connectors,
  defaultActionGroupId,
  defaultActionMessage,
  messageVariables,
  actionGroups,
  setActionGroupIdByIndex,
  actionTypeRegistry,
  isActionGroupDisabledForActionType,
  defaultParams,
}: ActionTypeFormProps) => {
  const {
    application: { capabilities },
  } = useKibana().services;
  const [isOpen, setIsOpen] = useState(true);
  const [availableActionVariables, setAvailableActionVariables] = useState<ActionVariable[]>([]);
  const defaultActionGroup = actionGroups?.find(({ id }) => id === defaultActionGroupId);
  const selectedActionGroup =
    actionGroups?.find(({ id }) => id === actionItem.group) ?? defaultActionGroup;
  const [actionGroup, setActionGroup] = useState<string>();
  const [actionParamsErrors, setActionParamsErrors] = useState<{ errors: IErrorObject }>({
    errors: {},
  });

  useEffect(() => {
    setAvailableActionVariables(
      messageVariables ? getAvailableActionVariables(messageVariables, selectedActionGroup) : []
    );
    if (defaultParams) {
      for (const [key, paramValue] of Object.entries(defaultParams)) {
        if (actionItem.params[key] === undefined || actionItem.params[key] === null) {
          setActionParamsProperty(key, paramValue, index);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionItem.group]);

  useEffect(() => {
    if (defaultParams && actionGroup) {
      for (const [key, paramValue] of Object.entries(defaultParams)) {
        setActionParamsProperty(key, paramValue, index);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionGroup]);

  useEffect(() => {
    (async () => {
      const res: { errors: IErrorObject } = await actionTypeRegistry
        .get(actionItem.actionTypeId)
        ?.validateParams(actionItem.params);
      setActionParamsErrors(res);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionItem]);

  const canSave = hasSaveActionsCapability(capabilities);

  const actionGroupDisplay = (
    actionGroupId: string,
    actionGroupName: string,
    actionTypeId: string
  ): string =>
    isActionGroupDisabledForActionType
      ? isActionGroupDisabledForActionType(actionGroupId, actionTypeId)
        ? i18n.translate(
            'xpack.triggersActionsUI.sections.actionTypeForm.addNewActionConnectorActionGroup.display',
            {
              defaultMessage: '{actionGroupName} (Not Currently Supported)',
              values: { actionGroupName },
            }
          )
        : actionGroupName
      : actionGroupName;

  const isActionGroupDisabled = (actionGroupId: string, actionTypeId: string): boolean =>
    isActionGroupDisabledForActionType
      ? isActionGroupDisabledForActionType(actionGroupId, actionTypeId)
      : false;

  const actionTypeRegistered = actionTypeRegistry.get(actionConnector.actionTypeId);
  if (!actionTypeRegistered) return null;

  const ParamsFieldsComponent = actionTypeRegistered.actionParamsFields;
  const checkEnabledResult = checkActionFormActionTypeEnabled(
    actionTypesIndex[actionConnector.actionTypeId],
    connectors.filter((connector) => connector.isPreconfigured)
  );

  const accordionContent = checkEnabledResult.isEnabled ? (
    <>
      {actionGroups && selectedActionGroup && setActionGroupIdByIndex && (
        <>
          <EuiSuperSelect
            prepend={
              <EuiFormLabel htmlFor={`addNewActionConnectorActionGroup-${actionItem.actionTypeId}`}>
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.actionTypeForm.actionRunWhenInActionGroup"
                  defaultMessage="Run when"
                />
              </EuiFormLabel>
            }
            fullWidth
            id={`addNewActionConnectorActionGroup-${actionItem.actionTypeId}`}
            data-test-subj={`addNewActionConnectorActionGroup-${index}`}
            options={actionGroups.map(({ id: value, name }) => ({
              value,
              inputDisplay: actionGroupDisplay(value, name, actionItem.actionTypeId),
              disabled: isActionGroupDisabled(value, actionItem.actionTypeId),
              'data-test-subj': `addNewActionConnectorActionGroup-${index}-option-${value}`,
            }))}
            valueOfSelected={selectedActionGroup.id}
            onChange={(group) => {
              setActionGroupIdByIndex(group, index);
              setActionGroup(group);
            }}
          />

          <EuiSpacer size="l" />
        </>
      )}
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.actionTypeForm.actionIdLabel"
            defaultMessage="{connectorInstance} connector"
            values={{
              connectorInstance: actionTypesIndex
                ? actionTypesIndex[actionConnector.actionTypeId].name
                : actionConnector.actionTypeId,
            }}
          />
        }
        labelAppend={
          canSave &&
          actionTypesIndex &&
          actionTypesIndex[actionConnector.actionTypeId].enabledInConfig ? (
            <EuiButtonEmpty
              size="xs"
              data-test-subj={`addNewActionConnectorButton-${actionItem.actionTypeId}`}
              onClick={onAddConnector}
            >
              <FormattedMessage
                defaultMessage="Add connector"
                id="xpack.triggersActionsUI.sections.actionTypeForm.addNewConnectorEmptyButton"
              />
            </EuiButtonEmpty>
          ) : null
        }
      >
        <ConnectorsSelection
          actionItem={actionItem}
          accordionIndex={index}
          actionTypesIndex={actionTypesIndex}
          actionTypeRegistered={actionTypeRegistered}
          connectors={connectors}
          onConnectorSelected={onConnectorSelected}
        />
      </EuiFormRow>
      <EuiSpacer size="xl" />
      {ParamsFieldsComponent ? (
        <EuiErrorBoundary>
          <Suspense fallback={null}>
            <ParamsFieldsComponent
              actionParams={actionItem.params as any}
              index={index}
              errors={actionParamsErrors.errors}
              editAction={setActionParamsProperty}
              messageVariables={availableActionVariables}
              defaultMessage={selectedActionGroup?.defaultActionMessage ?? defaultActionMessage}
              actionConnector={actionConnector}
            />
          </Suspense>
        </EuiErrorBoundary>
      ) : null}
    </>
  ) : (
    checkEnabledResult.messageCard
  );

  return (
    <EuiAccordion
      initialIsOpen={true}
      key={index}
      id={index.toString()}
      onToggle={setIsOpen}
      paddingSize="l"
      className="actAccordionActionForm"
      buttonContentClassName="actAccordionActionForm__button"
      data-test-subj={`alertActionAccordion-${index}`}
      buttonContent={
        <EuiFlexGroup gutterSize="l" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type={actionTypeRegistered.iconClass} size="m" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <div>
                <EuiFlexGroup gutterSize="s">
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
                  {selectedActionGroup && !isOpen && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge>{selectedActionGroup.name}</EuiBadge>
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem grow={false}>
                    {checkEnabledResult.isEnabled === false && (
                      <>
                        <EuiIconTip
                          type="alert"
                          color="danger"
                          content={i18n.translate(
                            'xpack.triggersActionsUI.sections.actionTypeForm.actionDisabledTitle',
                            {
                              defaultMessage: 'This action is disabled',
                            }
                          )}
                          position="right"
                        />
                      </>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      extraAction={
        <EuiButtonIcon
          iconType="minusInCircle"
          color="danger"
          className="actAccordionActionForm__extraAction"
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.sections.actionTypeForm.accordion.deleteIconAriaLabel',
            {
              defaultMessage: 'Delete',
            }
          )}
          onClick={onDeleteAction}
        />
      }
    >
      {accordionContent}
    </EuiAccordion>
  );
};

function getAvailableActionVariables(
  actionVariables: ActionVariables,
  actionGroup?: ActionGroupWithMessageVariables
) {
  const transformedActionVariables: ActionVariable[] = transformActionVariables(
    actionVariables,
    actionGroup?.omitMessageVariables
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
