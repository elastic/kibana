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
  EuiTabs,
  EuiTab,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Option, none, some } from 'fp-ts/lib/Option';
import { ActionConnectorForm, getConnectorErrors } from './action_connector_form';
import { TestConnectorForm } from './test_connector_form';
import {
  ActionConnector,
  ActionTypeRegistryContract,
  UserConfiguredActionConnector,
} from '../../../types';
import { ConnectorReducer, createConnectorReducer } from './connector_reducer';
import { updateActionConnector, executeAction } from '../../lib/action_connector_api';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import {
  ActionTypeExecutorResult,
  isActionTypeExecutorResult,
} from '../../../../../actions/common';
import './connector_edit_flyout.scss';
import { useKibana } from '../../../common/lib/kibana';
import { getConnectorWithInvalidatedFields } from '../../lib/value_validators';

export interface ConnectorEditFlyoutProps {
  initialConnector: ActionConnector;
  onClose: () => void;
  tab?: EditConectorTabs;
  reloadConnectors?: () => Promise<ActionConnector[] | void>;
  consumer?: string;
  actionTypeRegistry: ActionTypeRegistryContract;
}

export enum EditConectorTabs {
  Configuration = 'configuration',
  Test = 'test',
}

export const ConnectorEditFlyout = ({
  initialConnector,
  onClose,
  tab = EditConectorTabs.Configuration,
  reloadConnectors,
  consumer,
  actionTypeRegistry,
}: ConnectorEditFlyoutProps) => {
  const {
    http,
    notifications: { toasts },
    docLinks,
    application: { capabilities },
  } = useKibana().services;
  const getConnectorWithoutSecrets = () => ({
    ...(initialConnector as UserConfiguredActionConnector<
      Record<string, unknown>,
      Record<string, unknown>
    >),
    secrets: {},
  });
  const canSave = hasSaveActionsCapability(capabilities);

  const reducer: ConnectorReducer<
    Record<string, unknown>,
    Record<string, unknown>
  > = createConnectorReducer<Record<string, unknown>, Record<string, unknown>>();
  const [{ connector }, dispatch] = useReducer(reducer, {
    connector: getConnectorWithoutSecrets(),
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [selectedTab, setTab] = useState<EditConectorTabs>(tab);

  const [hasChanges, setHasChanges] = useState<boolean>(false);

  const setConnector = (value: any) => {
    dispatch({ command: { type: 'setConnector' }, payload: { key: 'connector', value } });
  };

  const [testExecutionActionParams, setTestExecutionActionParams] = useState<
    Record<string, unknown>
  >({});
  const [testExecutionResult, setTestExecutionResult] = useState<
    Option<ActionTypeExecutorResult<unknown>>
  >(none);
  const [isExecutingAction, setIsExecutinAction] = useState<boolean>(false);
  const handleSetTab = useCallback(
    () =>
      setTab((prevTab) => {
        if (prevTab === EditConectorTabs.Configuration) {
          return EditConectorTabs.Test;
        }
        if (testExecutionResult !== none) {
          setTestExecutionResult(none);
        }
        return EditConectorTabs.Configuration;
      }),
    [testExecutionResult]
  );

  const closeFlyout = useCallback(() => {
    setConnector(getConnectorWithoutSecrets());
    setHasChanges(false);
    setTestExecutionResult(none);
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const actionTypeModel = actionTypeRegistry.get(connector.actionTypeId);
  const {
    configErrors,
    connectorBaseErrors,
    connectorErrors,
    secretsErrors,
  } = !connector.isPreconfigured
    ? getConnectorErrors(connector, actionTypeModel)
    : {
        configErrors: {},
        connectorBaseErrors: {},
        connectorErrors: {},
        secretsErrors: {},
      };

  const hasErrors = !!Object.keys(connectorErrors).find(
    (errorKey) => connectorErrors[errorKey].length >= 1
  );

  const onActionConnectorSave = async (): Promise<ActionConnector | undefined> =>
    await updateActionConnector({ http, connector, id: connector.id })
      .then((savedConnector) => {
        toasts.addSuccess(
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
        toasts.addDanger(
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
      </h3>
    </EuiTitle>
  );

  const onExecutAction = () => {
    setIsExecutinAction(true);
    return executeAction({ id: connector.id, params: testExecutionActionParams, http })
      .then((result) => {
        setIsExecutinAction(false);
        setTestExecutionResult(some(result));
        return result;
      })
      .catch((ex: Error | ActionTypeExecutorResult<unknown>) => {
        const result: ActionTypeExecutorResult<unknown> = isActionTypeExecutorResult(ex)
          ? ex
          : {
              actionId: connector.id,
              status: 'error',
              message: ex.message,
            };
        setIsExecutinAction(false);
        setTestExecutionResult(some(result));
        return result;
      });
  };

  const onSaveClicked = async (closeAfterSave: boolean = true) => {
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
      setHasChanges(false);
      if (closeAfterSave) {
        closeFlyout();
      }
      if (reloadConnectors) {
        reloadConnectors();
      }
    }
  };

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
        <EuiTabs className="connectorEditFlyoutTabs">
          <EuiTab
            onClick={handleSetTab}
            data-test-subj="configureConnectorTab"
            isSelected={EditConectorTabs.Configuration === selectedTab}
          >
            {i18n.translate('xpack.triggersActionsUI.sections.editConnectorForm.tabText', {
              defaultMessage: 'Configuration',
            })}
          </EuiTab>
          <EuiTab
            onClick={handleSetTab}
            data-test-subj="testConnectorTab"
            isSelected={EditConectorTabs.Test === selectedTab}
          >
            {i18n.translate('xpack.triggersActionsUI.sections.testConnectorForm.tabText', {
              defaultMessage: 'Test',
            })}
          </EuiTab>
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {selectedTab === EditConectorTabs.Configuration ? (
          !connector.isPreconfigured ? (
            <ActionConnectorForm
              connector={connector}
              errors={connectorErrors}
              dispatch={(changes) => {
                setHasChanges(true);
                // if the user changes the connector, "forget" the last execution
                // so the user comes back to a clean form ready to run a fresh test
                setTestExecutionResult(none);
                dispatch(changes);
              }}
              actionTypeRegistry={actionTypeRegistry}
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
          )
        ) : (
          <TestConnectorForm
            connector={connector}
            executeEnabled={!hasChanges}
            actionParams={testExecutionActionParams}
            setActionParams={setTestExecutionActionParams}
            onExecutAction={onExecutAction}
            isExecutingAction={isExecutingAction}
            executionResult={testExecutionResult}
            actionTypeRegistry={actionTypeRegistry}
          />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} data-test-subj="cancelSaveEditedConnectorButton">
              {i18n.translate(
                'xpack.triggersActionsUI.sections.editConnectorForm.cancelButtonLabel',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween">
              {canSave && actionTypeModel && !connector.isPreconfigured ? (
                <Fragment>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      color="secondary"
                      data-test-subj="saveEditedActionButton"
                      isLoading={isSaving || isExecutingAction}
                      onClick={async () => {
                        await onSaveClicked(false);
                      }}
                    >
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.editConnectorForm.saveButtonLabel"
                        defaultMessage="Save"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      fill
                      color="secondary"
                      data-test-subj="saveAndCloseEditedActionButton"
                      type="submit"
                      isLoading={isSaving || isExecutingAction}
                      onClick={async () => {
                        await onSaveClicked();
                      }}
                    >
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.editConnectorForm.saveAndCloseButtonLabel"
                        defaultMessage="Save & Close"
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

// eslint-disable-next-line import/no-default-export
export { ConnectorEditFlyout as default };
