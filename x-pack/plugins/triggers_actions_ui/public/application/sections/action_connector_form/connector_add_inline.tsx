/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
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
} from '@elastic/eui';
import { AlertAction, ActionTypeIndex } from '../../../types';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { ActionAccordionFormProps } from './action_form';
import { useKibana } from '../../../common/lib/kibana';

type AddConnectorInFormProps = {
  actionTypesIndex: ActionTypeIndex;
  actionItem: AlertAction;
  index: number;
  onAddConnector: () => void;
  onDeleteConnector: () => void;
  emptyActionsIds: string[];
} & Pick<ActionAccordionFormProps, 'actionTypeRegistry'>;

export const AddConnectorInline = ({
  actionTypesIndex,
  actionItem,
  index,
  onAddConnector,
  onDeleteConnector,
  actionTypeRegistry,
  emptyActionsIds,
}: AddConnectorInFormProps) => {
  const {
    application: { capabilities },
  } = useKibana().services;
  const canSave = hasSaveActionsCapability(capabilities);

  const actionTypeName = actionTypesIndex
    ? actionTypesIndex[actionItem.actionTypeId].name
    : actionItem.actionTypeId;
  const actionTypeRegistered = actionTypeRegistry.get(actionItem.actionTypeId);

  const noConnectorsLabel = (
    <FormattedMessage
      id="xpack.triggersActionsUI.sections.alertForm.emptyConnectorsLabel"
      defaultMessage="No {actionTypeName} connectors"
      values={{
        actionTypeName,
      }}
    />
  );
  return (
    <Fragment key={index}>
      <EuiAccordion
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
                    id="xpack.triggersActionsUI.sections.alertForm.newAlertActionTypeEditTitle"
                    values={{
                      actionConnectorName: actionTypeRegistered.actionTypeTitle,
                    }}
                  />
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
            onClick={onDeleteConnector}
          />
        }
        paddingSize="l"
      >
        {canSave ? (
          <EuiEmptyPrompt
            title={
              emptyActionsIds.find((emptyId: string) => actionItem.id === emptyId) ? (
                noConnectorsLabel
              ) : (
                <EuiCallOut
                  data-test-subj="alertActionAccordionCallout"
                  title={i18n.translate(
                    'xpack.triggersActionsUI.sections.alertForm.unableToLoadConnectorTitle',
                    {
                      defaultMessage: 'Unable to load connector.',
                    }
                  )}
                  color="warning"
                />
              )
            }
            actions={[
              <EuiButton
                color="primary"
                fill
                size="s"
                data-test-subj={`createActionConnectorButton-${index}`}
                onClick={onAddConnector}
              >
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.alertForm.addConnectorButtonLabel"
                  defaultMessage="Create a connector"
                />
              </EuiButton>,
            ]}
          />
        ) : (
          <EuiCallOut title={noConnectorsLabel}>
            <p>
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertForm.unauthorizedToCreateForEmptyConnectors"
                defaultMessage="Only authorized users can configure a connector. Contact your administrator."
              />
            </p>
          </EuiCallOut>
        )}
      </EuiAccordion>
      <EuiSpacer size="xs" />
    </Fragment>
  );
};
