/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiAccordion,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiCallOut,
  EuiText,
  EuiFormRow,
  EuiButtonEmpty,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiIconTip,
} from '@elastic/eui';
import { AlertAction, ActionTypeIndex, ActionConnector } from '../../../types';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { ActionAccordionFormProps } from './action_form';
import { useKibana } from '../../../common/lib/kibana';

type AddConnectorInFormProps = {
  actionTypesIndex: ActionTypeIndex;
  actionItem: AlertAction;
  connectors: ActionConnector[];
  index: number;
  onAddConnector: () => void;
  onDeleteConnector: () => void;
  onSelectConnector: (connectorId: string) => void;
  emptyActionsIds: string[];
} & Pick<ActionAccordionFormProps, 'actionTypeRegistry'>;

export const AddConnectorInline = ({
  actionTypesIndex,
  actionItem,
  index,
  connectors,
  onAddConnector,
  onDeleteConnector,
  onSelectConnector,
  actionTypeRegistry,
  emptyActionsIds,
}: AddConnectorInFormProps) => {
  const {
    application: { capabilities },
  } = useKibana().services;
  const canSave = hasSaveActionsCapability(capabilities);
  const [connectorOptionsList, setConnectorOptionsList] = useState<EuiComboBoxOptionOption[]>([]);
  const [isEmptyActionId, setIsEmptyActionId] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);

  const actionTypeName = actionTypesIndex
    ? actionTypesIndex[actionItem.actionTypeId].name
    : actionItem.actionTypeId;
  const actionType = actionTypesIndex[actionItem.actionTypeId];
  const actionTypeRegistered = actionTypeRegistry.get(actionItem.actionTypeId);

  const noConnectorsLabel = (
    <FormattedMessage
      id="xpack.triggersActionsUI.sections.connectorAddInline.emptyConnectorsLabel"
      defaultMessage="No {actionTypeName} connectors"
      values={{
        actionTypeName,
      }}
    />
  );

  const unableToLoadConnectorLabel = (
    <EuiText color="danger">
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.connectorAddInline.unableToLoadConnectorTitle"
        defaultMessage="Unable to load connector"
      />
    </EuiText>
  );

  useEffect(() => {
    if (connectors) {
      const altConnectorOptions = connectors
        .filter(
          (connector) =>
            connector.actionTypeId === actionItem.actionTypeId &&
            // include only enabled by config connectors or preconfigured
            (actionType?.enabledInConfig || connector.isPreconfigured)
        )
        .map(({ name, id, isPreconfigured }) => ({
          label: `${name} ${isPreconfigured ? '(preconfigured)' : ''}`,
          key: id,
          id,
        }));
      setConnectorOptionsList(altConnectorOptions);

      if (altConnectorOptions.length > 0) {
        setErrors([`Unable to load ${actionTypeRegistered.actionTypeTitle} connector`]);
      }
    }

    setIsEmptyActionId(!!emptyActionsIds.find((emptyId: string) => actionItem.id === emptyId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectorsDropdown = (
    <EuiFlexGroup component="div">
      <EuiFlexItem>
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.connectorAddInline.connectorAddInline.actionIdLabel"
              defaultMessage="Use another {connectorInstance} connector"
              values={{
                connectorInstance: actionTypeName,
              }}
            />
          }
          labelAppend={
            <EuiButtonEmpty
              size="xs"
              data-test-subj={`addNewActionConnectorButton-${actionItem.actionTypeId}`}
              onClick={onAddConnector}
            >
              <FormattedMessage
                defaultMessage="Add connector"
                id="xpack.triggersActionsUI.sections.connectorAddInline.connectorAddInline.addNewConnectorEmptyButton"
              />
            </EuiButtonEmpty>
          }
          error={errors}
          isInvalid={errors.length > 0}
        >
          <EuiComboBox
            fullWidth
            singleSelection={{ asPlainText: true }}
            options={connectorOptionsList}
            id={`selectActionConnector-${actionItem.id}-${index}`}
            data-test-subj={`selectActionConnector-${actionItem.actionTypeId}-${index}`}
            onChange={(selectedOptions) => {
              // On selecting a option from this combo box, this component will
              // be removed but the EuiComboBox performs some additional updates on
              // closing the dropdown. Wrapping in a `setTimeout` to avoid `React state
              // update on an unmounted component` warnings.
              setTimeout(() => {
                onSelectConnector(selectedOptions[0].id ?? '');
              });
            }}
            isClearable={false}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      <EuiAccordion
        key={index}
        initialIsOpen={true}
        id={index.toString()}
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
                  <FormattedMessage
                    defaultMessage="{actionConnectorName}"
                    id="xpack.triggersActionsUI.sections.connectorAddInline.newAlertActionTypeEditTitle"
                    values={{
                      actionConnectorName: actionTypeRegistered.actionTypeTitle,
                    }}
                  />
                </div>
              </EuiText>
            </EuiFlexItem>
            {!isEmptyActionId && (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type="alert"
                  size="m"
                  color="danger"
                  data-test-subj={`alertActionAccordionErrorTooltip`}
                  content={
                    <FormattedMessage
                      defaultMessage="Unable to load connector"
                      id="xpack.triggersActionsUI.sections.connectorAddInline.unableToLoadConnectorTitle'"
                    />
                  }
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        }
        extraAction={
          <EuiButtonIcon
            iconType="minusInCircle"
            color="danger"
            className="actAccordionActionForm__extraAction"
            aria-label={i18n.translate(
              'xpack.triggersActionsUI.sections.connectorAddInline.accordion.deleteIconAriaLabel',
              {
                defaultMessage: 'Delete',
              }
            )}
            onClick={onDeleteConnector}
          />
        }
        paddingSize="l"
      >
        {canSave ? (
          connectorOptionsList.length > 0 ? (
            connectorsDropdown
          ) : (
            <EuiEmptyPrompt
              title={isEmptyActionId ? noConnectorsLabel : unableToLoadConnectorLabel}
              actions={
                <EuiButton
                  color="primary"
                  fill
                  size="s"
                  data-test-subj={`createActionConnectorButton-${index}`}
                  onClick={onAddConnector}
                >
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.connectorAddInline.addConnectorButtonLabel"
                    defaultMessage="Create a connector"
                  />
                </EuiButton>
              }
            />
          )
        ) : (
          <EuiCallOut title={noConnectorsLabel}>
            <p>
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.connectorAddInline.unauthorizedToCreateForEmptyConnectors"
                defaultMessage="Only authorized users can configure a connector. Contact your administrator."
              />
            </p>
          </EuiCallOut>
        )}
      </EuiAccordion>
      <EuiSpacer size="xs" />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { AddConnectorInline as default };
