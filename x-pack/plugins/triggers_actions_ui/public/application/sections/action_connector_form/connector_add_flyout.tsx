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
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import { HttpSetup } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { ActionTypeMenu } from './action_type_menu';
import { ActionConnectorForm, getConnectorErrors } from './action_connector_form';
import {
  ActionType,
  ActionConnector,
  ActionTypeRegistryContract,
  UserConfiguredActionConnector,
} from '../../../types';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { createActionConnector } from '../../lib/action_connector_api';
import { VIEW_LICENSE_OPTIONS_LINK } from '../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';
import { createConnectorReducer, InitialConnector, ConnectorReducer } from './connector_reducer';
import { getConnectorWithInvalidatedFields } from '../../lib/value_validators';

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
  const {
    http,
    notifications: { toasts },
    application: { capabilities },
  } = useKibana().services;
  const [actionType, setActionType] = useState<ActionType | undefined>(undefined);
  const [hasActionsUpgradeableByTrial, setHasActionsUpgradeableByTrial] = useState<boolean>(false);

  // hooks
  const initialConnector: InitialConnector<Record<string, unknown>, Record<string, unknown>> = {
    actionTypeId: actionType?.id ?? '',
    config: {},
    secrets: {},
  };

  const reducer: ConnectorReducer<
    Record<string, unknown>,
    Record<string, unknown>
  > = createConnectorReducer<Record<string, unknown>, Record<string, unknown>>();
  const [{ connector }, dispatch] = useReducer(reducer, {
    connector: initialConnector as UserConfiguredActionConnector<
      Record<string, unknown>,
      Record<string, unknown>
    >,
  });

  const setActionProperty = <Key extends keyof ActionConnector>(
    key: Key,
    value:
      | UserConfiguredActionConnector<Record<string, unknown>, Record<string, unknown>>[Key]
      | null
  ) => {
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
  let saveButton;
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

    const {
      configErrors,
      connectorBaseErrors,
      connectorErrors,
      secretsErrors,
    } = getConnectorErrors(connector, actionTypeModel);
    hasErrors = !!Object.keys(connectorErrors).find(
      (errorKey) => connectorErrors[errorKey].length >= 1
    );

    currentForm = (
      <ActionConnectorForm
        actionTypeName={actionType.name}
        connector={connector}
        dispatch={dispatch}
        errors={connectorErrors}
        actionTypeRegistry={actionTypeRegistry}
        consumer={consumer}
      />
    );

    const onActionConnectorSave = async (): Promise<ActionConnector | undefined> =>
      await createActionConnector({ http, connector })
        .then((savedConnector) => {
          if (toasts) {
            toasts.addSuccess(
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
          toasts.addDanger(
            errorRes.body?.message ??
              i18n.translate(
                'xpack.triggersActionsUI.sections.addConnectorForm.updateErrorNotificationText',
                { defaultMessage: 'Cannot create a connector.' }
              )
          );
          return undefined;
        });

    const onSaveClicked = async () => {
      if (hasErrors) {
        setConnector(
          getConnectorWithInvalidatedFields(
            connector,
            configErrors,
            secretsErrors,
            connectorBaseErrors
          )
        );
        return;
      }
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

    saveButton = (
      <Fragment>
        {onTestConnector && (
          <EuiFlexItem grow={false}>
            <EuiButton
              color="secondary"
              data-test-subj="saveAndTestNewActionButton"
              type="submit"
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
                defaultMessage="Save & test"
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
    );
  }

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
              {canSave && actionTypeModel && actionType ? saveButton : null}
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
