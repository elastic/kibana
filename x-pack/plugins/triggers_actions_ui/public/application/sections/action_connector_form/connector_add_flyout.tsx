/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState, Fragment, useReducer } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiTitle,
  EuiFlyoutHeader,
  EuiFlyout,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiFlyoutBody,
  EuiBetaBadge,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import { HttpSetup } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { ActionTypeMenu } from './action_type_menu';
import { ActionConnectorForm, validateBaseProperties } from './action_connector_form';
import { ActionType, ActionConnector, IErrorObject } from '../../../types';
import { connectorReducer } from './connector_reducer';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { createActionConnector } from '../../lib/action_connector_api';
import { useActionsConnectorsContext } from '../../context/actions_connectors_context';
import { VIEW_LICENSE_OPTIONS_LINK } from '../../../common/constants';
import { PLUGIN } from '../../constants/plugin';

export interface ConnectorAddFlyoutProps {
  addFlyoutVisible: boolean;
  setAddFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
  actionTypes?: ActionType[];
}

export const ConnectorAddFlyout = ({
  addFlyoutVisible,
  setAddFlyoutVisibility,
  actionTypes,
}: ConnectorAddFlyoutProps) => {
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
  const [actionType, setActionType] = useState<ActionType | undefined>(undefined);
  const [hasActionsUpgradeableByTrial, setHasActionsUpgradeableByTrial] = useState<boolean>(false);

  // hooks
  const initialConnector = {
    actionTypeId: actionType?.id ?? '',
    config: {},
    secrets: {},
  } as ActionConnector;
  const [{ connector }, dispatch] = useReducer(connectorReducer, { connector: initialConnector });
  const setActionProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
  };
  const setConnector = (value: any) => {
    dispatch({ command: { type: 'setConnector' }, payload: { key: 'connector', value } });
  };

  const [isSaving, setIsSaving] = useState<boolean>(false);

  const closeFlyout = useCallback(() => {
    setAddFlyoutVisibility(false);
    setActionType(undefined);
    setConnector(initialConnector);
  }, [setAddFlyoutVisibility, initialConnector]);

  const canSave = hasSaveActionsCapability(capabilities);

  if (!addFlyoutVisible) {
    return null;
  }

  function onActionTypeChange(newActionType: ActionType) {
    setActionType(newActionType);
    setActionProperty('actionTypeId', newActionType.id);
  }

  let currentForm;
  let actionTypeModel;
  if (!actionType) {
    currentForm = (
      <ActionTypeMenu
        onActionTypeChange={onActionTypeChange}
        actionTypes={actionTypes}
        setHasActionsUpgradeableByTrial={setHasActionsUpgradeableByTrial}
      />
    );
  } else {
    actionTypeModel = actionTypeRegistry.get(actionType.id);

    const errors = {
      ...actionTypeModel?.validateConnector(connector).errors,
      ...validateBaseProperties(connector).errors,
    } as IErrorObject;
    hasErrors = !!Object.keys(errors).find((errorKey) => errors[errorKey].length >= 1);

    currentForm = (
      <ActionConnectorForm
        actionTypeName={actionType.name}
        connector={connector}
        dispatch={dispatch}
        errors={errors}
        actionTypeRegistry={actionTypeRegistry}
        http={http}
        docLinks={docLinks}
        consumer={consumer}
      />
    );
  }

  const onActionConnectorSave = async (): Promise<ActionConnector | undefined> =>
    await createActionConnector({ http, connector })
      .then((savedConnector) => {
        if (toastNotifications) {
          toastNotifications.addSuccess(
            i18n.translate(
              'xpack.triggersActionsUI.sections.addConnectorForm.updateSuccessNotificationText',
              {
                defaultMessage: "Created '{connectorName}'",
                values: {
                  connectorName: savedConnector.name,
                },
              }
            )
          );
        }
        return savedConnector;
      })
      .catch((errorRes) => {
        toastNotifications.addDanger(
          errorRes.body?.message ??
            i18n.translate(
              'xpack.triggersActionsUI.sections.addConnectorForm.updateErrorNotificationText',
              { defaultMessage: 'Cannot create a connector.' }
            )
        );
        return undefined;
      });

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutActionAddTitle" size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="m" alignItems="center">
          {actionTypeModel && actionTypeModel.iconClass ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionTypeModel.iconClass} size="xl" />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            {actionTypeModel && actionType ? (
              <Fragment>
                <EuiTitle size="s">
                  <h3 id="flyoutTitle">
                    <FormattedMessage
                      defaultMessage="{actionTypeName} connector"
                      id="xpack.triggersActionsUI.sections.addConnectorForm.flyoutTitle"
                      values={{
                        actionTypeName: actionType.name,
                      }}
                    />
                    &emsp;
                    <EuiBetaBadge
                      label="Beta"
                      tooltipContent={i18n.translate(
                        'xpack.triggersActionsUI.sections.addConnectorForm.betaBadgeTooltipContent',
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
                <EuiText size="s" color="subdued">
                  {actionTypeModel.selectMessage}
                </EuiText>
              </Fragment>
            ) : (
              <EuiTitle size="s">
                <h3 id="selectConnectorFlyoutTitle">
                  <FormattedMessage
                    defaultMessage="Select a connector"
                    id="xpack.triggersActionsUI.sections.addConnectorForm.selectConnectorFlyoutTitle"
                  />
                  &emsp;
                  <EuiBetaBadge
                    label="Beta"
                    tooltipContent={i18n.translate(
                      'xpack.triggersActionsUI.sections.addFlyout.betaBadgeTooltipContent',
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
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        banner={
          !actionType && hasActionsUpgradeableByTrial ? (
            <UpgradeYourLicenseCallOut http={http} />
          ) : (
            <Fragment />
          )
        }
      >
        {currentForm}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout}>
              {i18n.translate(
                'xpack.triggersActionsUI.sections.actionConnectorAdd.cancelButtonLabel',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {canSave && actionTypeModel && actionType ? (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                color="secondary"
                data-test-subj="saveNewActionButton"
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
                  id="xpack.triggersActionsUI.sections.actionConnectorAdd.saveButtonLabel"
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

const UpgradeYourLicenseCallOut = ({ http }: { http: HttpSetup }) => (
  <EuiCallOut
    title={i18n.translate(
      'xpack.triggersActionsUI.sections.actionConnectorAdd.upgradeYourPlanBannerTitle',
      { defaultMessage: 'Upgrade your license to access all connectors' }
    )}
  >
    <FormattedMessage
      id="xpack.triggersActionsUI.sections.actionConnectorAdd.upgradeYourPlanBannerMessage"
      defaultMessage="Upgrade your license or start a 30-day free trial for immediate access to all third-party connectors."
    />
    <EuiSpacer size="s" />
    <EuiFlexGroup gutterSize="s" wrap={true}>
      <EuiFlexItem grow={false}>
        <EuiButton
          href={`${http.basePath.get()}/app/management/stack/license_management`}
          iconType="gear"
          target="_blank"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.actionConnectorAdd.manageLicensePlanBannerLinkTitle"
            defaultMessage="Manage license"
          />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          href={VIEW_LICENSE_OPTIONS_LINK}
          iconType="popout"
          iconSide="right"
          target="_blank"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.actionConnectorAdd.upgradeYourPlanBannerLinkTitle"
            defaultMessage="Subscription plans"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiCallOut>
);

// eslint-disable-next-line import/no-default-export
export { ConnectorAddFlyout as default };
