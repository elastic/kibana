/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState, Fragment, useReducer, lazy, Suspense } from 'react';
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
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import { ApplicationStart, HttpSetup } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { EuiLoadingSpinner } from '@elastic/eui';
import { ActionTypeMenu } from './action_type_menu';
import { ActionConnectorForm, validateBaseProperties } from './action_connector_form';
import {
  ActionType,
  ActionConnector,
  IErrorObject,
  ActionTypeRegistryContract,
} from '../../../types';
import { connectorReducer } from './connector_reducer';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { createActionConnector } from '../../lib/action_connector_api';
import { VIEW_LICENSE_OPTIONS_LINK } from '../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';

export interface ConnectorAddFlyoutProps {
  onClose: () => void;
  actionTypes?: ActionType[];
  onTestConnector?: (connector: ActionConnector) => void;
  reloadConnectors?: () => Promise<ActionConnector[] | void>;
  consumer?: string;
  actionTypeRegistry: ActionTypeRegistryContract;
}

const ConnectorAddFlyout: React.FunctionComponent<ConnectorAddFlyoutProps> = ({
  onClose,
  actionTypes,
  onTestConnector,
  reloadConnectors,
  consumer,
  actionTypeRegistry,
}) => {
  let hasErrors = false;
  const { http, toastNotifications, application } = useKibana().services;
  const capabilities = application.capabilities;
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
    onClose();
  }, [onClose]);

  const canSave = hasSaveActionsCapability(capabilities);

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
        actionTypeRegistry={actionTypeRegistry}
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

  const onSaveClicked = async () => {
    setIsSaving(true);
    const savedAction = await onActionConnectorSave();
    setIsSaving(false);
    if (savedAction) {
      closeFlyout();
      if (reloadConnectors) {
        await reloadConnectors();
      }
    }
    return savedAction;
  };

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
            {!actionType ? (
              <EuiButtonEmpty data-test-subj="cancelButton" onClick={closeFlyout}>
                {i18n.translate(
                  'xpack.triggersActionsUI.sections.actionConnectorAdd.cancelButtonLabel',
                  {
                    defaultMessage: 'Cancel',
                  }
                )}
              </EuiButtonEmpty>
            ) : (
              <EuiButtonEmpty
                data-test-subj="backButton"
                onClick={() => {
                  setActionType(undefined);
                  setConnector(initialConnector);
                }}
              >
                {i18n.translate(
                  'xpack.triggersActionsUI.sections.actionConnectorAdd.backButtonLabel',
                  {
                    defaultMessage: 'Back',
                  }
                )}
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween">
              {canSave && actionTypeModel && actionType ? (
                <Fragment>
                  {onTestConnector && (
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        color="secondary"
                        data-test-subj="saveAndTestNewActionButton"
                        type="submit"
                        isDisabled={hasErrors}
                        isLoading={isSaving}
                        onClick={async () => {
                          const savedConnector = await onSaveClicked();
                          if (savedConnector) {
                            onTestConnector(savedConnector);
                          }
                        }}
                      >
                        <FormattedMessage
                          id="xpack.triggersActionsUI.sections.actionConnectorAdd.saveAndTestButtonLabel"
                          defaultMessage="Save & Test"
                        />
                      </EuiButton>
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      fill
                      color="secondary"
                      data-test-subj="saveNewActionButton"
                      type="submit"
                      isDisabled={hasErrors}
                      isLoading={isSaving}
                      onClick={onSaveClicked}
                    >
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.actionConnectorAdd.saveButtonLabel"
                        defaultMessage="Save"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                </Fragment>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
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

export const getAddConnectorFlyout = (
  consumer: string,
  onClose: () => void,
  actionTypeRegistry: ActionTypeRegistryContract,
  actionTypes?: ActionType[],
  reloadConnectors?: () => Promise<void | Array<
    ActionConnector<Record<string, any>, Record<string, any>>
  >>
) => {
  const ConnectorAddFlyoutForm = lazy(() => import('./connector_add_flyout'));
  return (
    <Suspense
      fallback={
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <ConnectorAddFlyoutForm
        consumer={consumer}
        onClose={onClose}
        actionTypeRegistry={actionTypeRegistry}
        actionTypes={actionTypes}
        reloadConnectors={reloadConnectors}
      />
    </Suspense>
  );
};
