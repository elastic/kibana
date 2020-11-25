/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Suspense, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiFormRow,
  EuiComboBox,
  EuiAccordion,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiIconTip,
  EuiText,
  EuiFormLabel,
  EuiFormControlLayout,
  EuiSuperSelect,
  EuiLoadingSpinner,
  EuiBadge,
  EuiErrorBoundary,
} from '@elastic/eui';
import { AlertActionParam, ResolvedActionGroup } from '../../../../../alerts/common';
import {
  IErrorObject,
  AlertAction,
  ActionTypeIndex,
  ActionConnector,
  ActionVariables,
  ActionVariable,
} from '../../../types';
import { checkActionFormActionTypeEnabled } from '../../lib/check_action_type_enabled';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { ActionAccordionFormProps } from './action_form';
import { transformActionVariables } from '../../lib/action_variables';
import { resolvedActionGroupMessage } from '../../constants';

export type ActionTypeFormProps = {
  actionItem: AlertAction;
  actionConnector: ActionConnector;
  actionParamsErrors: {
    errors: IErrorObject;
  };
  index: number;
  onAddConnector: () => void;
  onConnectorSelected: (id: string) => void;
  onDeleteAction: () => void;
  setActionParamsProperty: (key: string, value: AlertActionParam, index: number) => void;
  actionTypesIndex: ActionTypeIndex;
  connectors: ActionConnector[];
} & Pick<
  ActionAccordionFormProps,
  | 'defaultActionGroupId'
  | 'actionGroups'
  | 'setActionGroupIdByIndex'
  | 'setActionParamsProperty'
  | 'http'
  | 'actionTypeRegistry'
  | 'toastNotifications'
  | 'docLinks'
  | 'messageVariables'
  | 'defaultActionMessage'
  | 'capabilities'
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
  actionParamsErrors,
  index,
  onAddConnector,
  onConnectorSelected,
  onDeleteAction,
  setActionParamsProperty,
  actionTypesIndex,
  connectors,
  http,
  toastNotifications,
  docLinks,
  capabilities,
  actionTypeRegistry,
  defaultActionGroupId,
  defaultActionMessage,
  messageVariables,
  actionGroups,
  setActionGroupIdByIndex,
}: ActionTypeFormProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [availableActionVariables, setAvailableActionVariables] = useState<ActionVariable[]>([]);
  const [availableDefaultActionMessage, setAvailableDefaultActionMessage] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    setAvailableActionVariables(getAvailableActionVariables(messageVariables, actionItem.group));
    const res =
      actionItem.group === ResolvedActionGroup.id
        ? resolvedActionGroupMessage
        : defaultActionMessage;
    setAvailableDefaultActionMessage(res);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionItem.group]);

  const canSave = hasSaveActionsCapability(capabilities);
  const getSelectedOptions = (actionItemId: string) => {
    const selectedConnector = connectors.find((connector) => connector.id === actionItemId);
    if (
      !selectedConnector ||
      // if selected connector is not preconfigured and action type is for preconfiguration only,
      // do not show regular connectors of this type
      (actionTypesIndex &&
        !actionTypesIndex[selectedConnector.actionTypeId].enabledInConfig &&
        !selectedConnector.isPreconfigured)
    ) {
      return [];
    }
    const optionTitle = `${selectedConnector.name} ${
      selectedConnector.isPreconfigured ? preconfiguredMessage : ''
    }`;
    return [
      {
        label: optionTitle,
        value: optionTitle,
        id: actionItemId,
        'data-test-subj': 'itemActionConnector',
      },
    ];
  };

  const actionType = actionTypesIndex[actionItem.actionTypeId];

  const optionsList = connectors
    .filter(
      (connectorItem) =>
        connectorItem.actionTypeId === actionItem.actionTypeId &&
        // include only enabled by config connectors or preconfigured
        (actionType.enabledInConfig || connectorItem.isPreconfigured)
    )
    .map(({ name, id, isPreconfigured }) => ({
      label: `${name} ${isPreconfigured ? preconfiguredMessage : ''}`,
      key: id,
      id,
    }));
  const actionTypeRegistered = actionTypeRegistry.get(actionConnector.actionTypeId);
  if (!actionTypeRegistered) return null;

  const ParamsFieldsComponent = actionTypeRegistered.actionParamsFields;
  const checkEnabledResult = checkActionFormActionTypeEnabled(
    actionTypesIndex[actionConnector.actionTypeId],
    connectors.filter((connector) => connector.isPreconfigured)
  );

  const defaultActionGroup = actionGroups?.find(({ id }) => id === defaultActionGroupId);
  const selectedActionGroup =
    actionGroups?.find(({ id }) => id === actionItem.group) ?? defaultActionGroup;

  const accordionContent = checkEnabledResult.isEnabled ? (
    <Fragment>
      {actionGroups && selectedActionGroup && setActionGroupIdByIndex && (
        <Fragment>
          <EuiFlexGroup component="div">
            <EuiFlexItem grow={true}>
              <EuiFormControlLayout
                fullWidth
                prepend={
                  <EuiFormLabel
                    htmlFor={`addNewActionConnectorActionGroup-${actionItem.actionTypeId}`}
                  >
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.alertForm.actionRunWhenInActionGroup"
                      defaultMessage="Run When"
                    />
                  </EuiFormLabel>
                }
              >
                <EuiSuperSelect
                  fullWidth
                  id={`addNewActionConnectorActionGroup-${actionItem.actionTypeId}`}
                  data-test-subj={`addNewActionConnectorActionGroup-${index}`}
                  options={actionGroups.map(({ id: value, name }) => ({
                    value,
                    inputDisplay: name,
                    'data-test-subj': `addNewActionConnectorActionGroup-${index}-option-${value}`,
                  }))}
                  valueOfSelected={selectedActionGroup.id}
                  onChange={(group) => {
                    setActionGroupIdByIndex(group, index);
                  }}
                />
              </EuiFormControlLayout>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
        </Fragment>
      )}
      <EuiFlexGroup component="div">
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertForm.actionIdLabel"
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
                    id="xpack.triggersActionsUI.sections.alertForm.addNewConnectorEmptyButton"
                  />
                </EuiButtonEmpty>
              ) : null
            }
          >
            <EuiComboBox
              fullWidth
              singleSelection={{ asPlainText: true }}
              options={optionsList}
              id={`selectActionConnector-${actionItem.id}`}
              data-test-subj={`selectActionConnector-${actionItem.actionTypeId}`}
              selectedOptions={getSelectedOptions(actionItem.id)}
              onChange={(selectedOptions) => {
                onConnectorSelected(selectedOptions[0].id ?? '');
              }}
              isClearable={false}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xl" />
      {ParamsFieldsComponent ? (
        <EuiErrorBoundary>
          <Suspense
            fallback={
              <EuiFlexGroup justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="m" />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <ParamsFieldsComponent
              actionParams={actionItem.params as any}
              index={index}
              errors={actionParamsErrors.errors}
              editAction={setActionParamsProperty}
              messageVariables={availableActionVariables}
              defaultMessage={availableDefaultActionMessage}
              docLinks={docLinks}
              http={http}
              toastNotifications={toastNotifications}
              actionConnector={actionConnector}
            />
          </Suspense>
        </EuiErrorBoundary>
      ) : null}
    </Fragment>
  ) : (
    checkEnabledResult.messageCard
  );

  return (
    <Fragment key={index}>
      <EuiAccordion
        initialIsOpen={true}
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
                        id="xpack.triggersActionsUI.sections.alertForm.existingAlertActionTypeEditTitle"
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
                        <Fragment>
                          <EuiIconTip
                            type="alert"
                            color="danger"
                            content={i18n.translate(
                              'xpack.triggersActionsUI.sections.alertForm.actionDisabledTitle',
                              {
                                defaultMessage: 'This action is disabled',
                              }
                            )}
                            position="right"
                          />
                        </Fragment>
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
              'xpack.triggersActionsUI.sections.alertForm.accordion.deleteIconAriaLabel',
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
      <EuiSpacer size="m" />
    </Fragment>
  );
};

function getAvailableActionVariables(
  actionVariables: ActionVariables | undefined,
  actionGroup: string
) {
  if (!actionVariables) {
    return [];
  }
  const filteredActionVariables =
    actionGroup === ResolvedActionGroup.id
      ? { params: actionVariables.params, state: actionVariables.state }
      : actionVariables;

  return transformActionVariables(filteredActionVariables).sort((a, b) =>
    a.name.toUpperCase().localeCompare(b.name.toUpperCase())
  );
}
