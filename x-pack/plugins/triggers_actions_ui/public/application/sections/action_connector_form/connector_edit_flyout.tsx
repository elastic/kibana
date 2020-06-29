/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useReducer, useState, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiTitle,
  EuiFlyoutHeader,
  EuiFlyout,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiBetaBadge,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionConnectorForm, validateBaseProperties } from './action_connector_form';
import { ActionConnectorTableItem, ActionConnector, IErrorObject } from '../../../types';
import { connectorReducer } from './connector_reducer';
import { updateActionConnector } from '../../lib/action_connector_api';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { useActionsConnectorsContext } from '../../context/actions_connectors_context';
import { PLUGIN } from '../../constants/plugin';

export interface ConnectorEditProps {
  initialConnector: ActionConnectorTableItem;
  editFlyoutVisible: boolean;
  setEditFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ConnectorEditFlyout = ({
  initialConnector,
  editFlyoutVisible,
  setEditFlyoutVisibility,
}: ConnectorEditProps) => {
  let hasErrors = false;
  const {
    http,
    toastNotifications,
    capabilities,
    actionTypeRegistry,
    reloadConnectors,
    docLinks,
    consumer,
  } = useActionsConnectorsContext();
  const canSave = hasSaveActionsCapability(capabilities);
  const closeFlyout = useCallback(() => setEditFlyoutVisibility(false), [setEditFlyoutVisibility]);
  const [{ connector }, dispatch] = useReducer(connectorReducer, {
    connector: { ...initialConnector, secrets: {} },
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!editFlyoutVisible) {
    return null;
  }

  const actionTypeModel = actionTypeRegistry.get(connector.actionTypeId);
  const errors = {
    ...actionTypeModel?.validateConnector(connector).errors,
    ...validateBaseProperties(connector).errors,
  } as IErrorObject;
  hasErrors = !!Object.keys(errors).find((errorKey) => errors[errorKey].length >= 1);

  const onActionConnectorSave = async (): Promise<ActionConnector | undefined> =>
    await updateActionConnector({ http, connector, id: connector.id })
      .then((savedConnector) => {
        toastNotifications.addSuccess(
          i18n.translate(
            'xpack.triggersActionsUI.sections.editConnectorForm.updateSuccessNotificationText',
            {
              defaultMessage: "Updated '{connectorName}'",
              values: {
                connectorName: savedConnector.name,
              },
            }
          )
        );
        return savedConnector;
      })
      .catch((errorRes) => {
        toastNotifications.addDanger(
          errorRes.body?.message ??
            i18n.translate(
              'xpack.triggersActionsUI.sections.editConnectorForm.updateErrorNotificationText',
              { defaultMessage: 'Cannot update a connector.' }
            )
        );
        return undefined;
      });

  const flyoutTitle = connector.isPreconfigured ? (
    <Fragment>
      <EuiTitle size="s">
        <h3 id="flyoutTitle">
          <FormattedMessage
            defaultMessage="{connectorName}"
            id="xpack.triggersActionsUI.sections.preconfiguredConnectorForm.flyoutTitle"
            values={{ connectorName: initialConnector.name }}
          />
          &emsp;
          <EuiBetaBadge
            label="Preconfigured"
            data-test-subj="preconfiguredBadge"
            tooltipContent={i18n.translate(
              'xpack.triggersActionsUI.sections.preconfiguredConnectorForm.tooltipContent',
              {
                defaultMessage: 'This connector is preconfigured and cannot be edited',
              }
            )}
          />
          &emsp;
          <EuiBetaBadge
            label="Beta"
            tooltipContent={i18n.translate(
              'xpack.triggersActionsUI.sections.preconfiguredConnectorForm.betaBadgeTooltipContent',
              {
                defaultMessage:
                  '{pluginName} is in beta and is subject to change. The design and code is less mature than official GA features and is being provided as-is with no warranties. Beta features are not subject to the support SLA of official GA features.',
                values: {
                  pluginName: PLUGIN.getI18nName(i18n),
                },
              }
            )}
          />
        </h3>
      </EuiTitle>
      <EuiText size="s">
        <FormattedMessage
          defaultMessage="{actionDescription}"
          id="xpack.triggersActionsUI.sections.editConnectorForm.actionTypeDescription"
          values={{ actionDescription: actionTypeModel.selectMessage }}
        />
      </EuiText>
    </Fragment>
  ) : (
    <EuiTitle size="s">
      <h3 id="flyoutTitle">
        <FormattedMessage
          defaultMessage="Edit connector"
          id="xpack.triggersActionsUI.sections.editConnectorForm.flyoutPreconfiguredTitle"
        />
        &emsp;
        <EuiBetaBadge
          label="Beta"
          tooltipContent={i18n.translate(
            'xpack.triggersActionsUI.sections.editConnectorForm.betaBadgeTooltipContent',
            {
              defaultMessage:
                '{pluginName} is in beta and is subject to change. The design and code is less mature than official GA features and is being provided as-is with no warranties. Beta features are not subject to the support SLA of official GA features.',
              values: {
                pluginName: PLUGIN.getI18nName(i18n),
              },
            }
          )}
        />
      </h3>
    </EuiTitle>
  );

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutActionEditTitle" size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {actionTypeModel ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionTypeModel.iconClass} size="m" />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>{flyoutTitle}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {!connector.isPreconfigured ? (
          <ActionConnectorForm
            connector={connector}
            errors={errors}
            actionTypeName={connector.actionType}
            dispatch={dispatch}
            actionTypeRegistry={actionTypeRegistry}
            http={http}
            docLinks={docLinks}
            consumer={consumer}
          />
        ) : (
          <Fragment>
            <EuiText>
              {i18n.translate(
                'xpack.triggersActionsUI.sections.editConnectorForm.descriptionText',
                {
                  defaultMessage: 'This connector is readonly.',
                }
              )}
            </EuiText>
            <EuiLink
              href={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/pre-configured-action-types-and-connectors.html`}
              target="_blank"
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.editConnectorForm.preconfiguredHelpLabel"
                defaultMessage="Learn more about preconfigured connectors."
              />
            </EuiLink>
          </Fragment>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout}>
              {i18n.translate(
                'xpack.triggersActionsUI.sections.editConnectorForm.cancelButtonLabel',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {canSave && actionTypeModel && !connector.isPreconfigured ? (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                color="secondary"
                data-test-subj="saveEditedActionButton"
                type="submit"
                iconType="check"
                isDisabled={hasErrors}
                isLoading={isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  const savedAction = await onActionConnectorSave();
                  setIsSaving(false);
                  if (savedAction) {
                    closeFlyout();
                    if (reloadConnectors) {
                      reloadConnectors();
                    }
                  }
                }}
              >
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.editConnectorForm.saveButtonLabel"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

// eslint-disable-next-line import/no-default-export
export { ConnectorEditFlyout as default };
