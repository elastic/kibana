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
import { ActionConnectorForm, validateBaseProperties } from './action_connector_form';
import { TestConnectorForm } from './test_connector_form';
import { ActionConnectorTableItem, ActionConnector, IErrorObject } from '../../../types';
import { connectorReducer } from './connector_reducer';
import { updateActionConnector, executeAction } from '../../lib/action_connector_api';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { useActionsConnectorsContext } from '../../context/actions_connectors_context';
import { PLUGIN } from '../../constants/plugin';
import { ActionTypeExecutorResult } from '../../../../../actions/common';
import './connector_edit_flyout.scss';

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

  const [{ connector }, dispatch] = useReducer(connectorReducer, {
    connector: { ...initialConnector, secrets: {} },
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [selectedTab, setTab] = useState<'config' | 'test'>('config');

  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const setConnector = (key: string, value: any) => {
    dispatch({ command: { type: 'setConnector' }, payload: { key, value } });
  };

  const [testExecutionActionParams, setTestExecutionActionParams] = useState<
    Record<string, unknown>
  >({});
  const [testExecutionResult, setTestExecutionResult] = useState<
    Option<ActionTypeExecutorResult<unknown>>
  >(none);
  const [isExecutingAction, setIsExecutinAction] = useState<boolean>(false);

  const closeFlyout = useCallback(() => {
    setEditFlyoutVisibility(false);
    setConnector('connector', { ...initialConnector, secrets: {} });
    setHasChanges(false);
    setTestExecutionResult(none);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setEditFlyoutVisibility]);

  if (!editFlyoutVisible) {
    return null;
  }

  const actionTypeModel = actionTypeRegistry.get(connector.actionTypeId);
  const errorsInConnectorConfig = {
    ...actionTypeModel?.validateConnector(connector).errors,
    ...validateBaseProperties(connector).errors,
  } as IErrorObject;
  const hasErrorsInConnectorConfig = !!Object.keys(errorsInConnectorConfig).find(
    (errorKey) => errorsInConnectorConfig[errorKey].length >= 1
  );

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

  const onExecutAction = () => {
    setIsExecutinAction(true);
    return executeAction({ id: connector.id, params: testExecutionActionParams, http }).then(
      (result) => {
        setIsExecutinAction(false);
        setTestExecutionResult(some(result));
        return result;
      }
    );
  };

  const onSaveClicked = async (closeAfterSave: boolean = true) => {
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
            onClick={() => setTab('config')}
            data-test-subj="configureConnectorTab"
            isSelected={'config' === selectedTab}
          >
            {i18n.translate('xpack.triggersActionsUI.sections.editConnectorForm.tabText', {
              defaultMessage: 'Configuration',
            })}
          </EuiTab>
          <EuiTab
            onClick={() => setTab('test')}
            data-test-subj="testConnectorTab"
            isSelected={'test' === selectedTab}
          >
            {i18n.translate('xpack.triggersActionsUI.sections.testConnectorForm.tabText', {
              defaultMessage: 'Test',
            })}
          </EuiTab>
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {selectedTab === 'config' ? (
          !connector.isPreconfigured ? (
            <ActionConnectorForm
              connector={connector}
              errors={errorsInConnectorConfig}
              actionTypeName={connector.actionType}
              dispatch={(changes) => {
                setHasChanges(true);
                // if the user changes the connector, "forget" the last execution
                // so the user comes back to a clean form ready to run a fresh test
                setTestExecutionResult(none);
                dispatch(changes);
              }}
              actionTypeRegistry={actionTypeRegistry}
              http={http}
              docLinks={docLinks}
              capabilities={capabilities}
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
                      isDisabled={hasErrorsInConnectorConfig || !hasChanges}
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
                      isDisabled={hasErrorsInConnectorConfig || !hasChanges}
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
