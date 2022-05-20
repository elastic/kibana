/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiFlyout,
  EuiBetaBadge,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutHeader,
  EuiIcon,
  EuiTab,
  EuiTabs,
  EuiFlyoutBody,
  EuiLink,
  EuiButton,
  EuiButtonEmpty,
  EuiFlyoutFooter,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ActionTypeExecutorResult, isActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { Option, none, some } from 'fp-ts/lib/Option';
import {
  ActionConnector,
  ActionTypeModel,
  ActionTypeRegistryContract,
  EditConnectorTabs,
  UserConfiguredActionConnector,
} from '../../../types';
import { ConnectorForm, CreateConnectorFormState } from './connector_form';
import { Connector } from './types';
import { useUpdateConnector } from '../../hooks/use_edit_connector';
import { useKibana } from '../../../common/lib/kibana';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import TestConnectorForm from './test_connector_form';
import { useExecuteConnector } from '../../hooks/use_execute_connector';

interface EditConnectorFlyoutProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  connector: ActionConnector;
  onClose: () => void;
  tab?: EditConnectorTabs;
  reloadConnectors?: () => Promise<ActionConnector[] | void>;
}

const getConnectorWithoutSecrets = (
  connector: UserConfiguredActionConnector<Record<string, unknown>, Record<string, unknown>>
) => ({
  ...connector,
  secrets: {},
});

const FlyoutHeaderTitle: React.FC<{
  isPreconfigured: boolean;
  connectorName: string;
  connectorTypeDesc: string;
}> = ({ isPreconfigured, connectorTypeDesc, connectorName }) => {
  return isPreconfigured ? (
    <>
      <EuiTitle size="s">
        <h3 id="flyoutTitle">
          <FormattedMessage
            defaultMessage="{connectorName}"
            id="xpack.triggersActionsUI.sections.preconfiguredConnectorForm.flyoutTitle"
            values={{ connectorName }}
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
          defaultMessage="{connectorTypeDesc}"
          id="xpack.triggersActionsUI.sections.editConnectorForm.actionTypeDescription"
          values={{ connectorTypeDesc }}
        />
      </EuiText>
    </>
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
};

const ReadOnlyConnectorMessage: React.FC<{ href: string }> = ({ href }) => {
  return (
    <>
      <EuiText>
        {i18n.translate('xpack.triggersActionsUI.sections.editConnectorForm.descriptionText', {
          defaultMessage: 'This connector is readonly.',
        })}
      </EuiText>
      <EuiLink href={href} target="_blank">
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.editConnectorForm.preconfiguredHelpLabel"
          defaultMessage="Learn more about preconfigured connectors."
        />
      </EuiLink>
    </>
  );
};

const EditConnectorFlyoutComponent: React.FC<EditConnectorFlyoutProps> = ({
  actionTypeRegistry,
  connector,
  onClose,
  tab = EditConnectorTabs.Configuration,
  reloadConnectors,
}) => {
  const {
    docLinks,
    application: { capabilities },
  } = useKibana().services;
  const isMounted = useRef(false);
  const canSave = hasSaveActionsCapability(capabilities);
  const { isLoading: isUpdatingConnector, updateConnector } = useUpdateConnector();
  const { isLoading: isExecutingConnector, executeConnector } = useExecuteConnector();

  const [preSubmitValidationErrorMessage, setPreSubmitValidationErrorMessage] =
    useState<ReactNode>(null);

  const [formState, setFormState] = useState<CreateConnectorFormState>({
    isSubmitted: false,
    isSubmitting: false,
    isValid: undefined,
    submit: async () => ({ isValid: false, data: {} as Connector }),
    preSubmitValidator: null,
  });

  const [selectedTab, setTab] = useState<EditConnectorTabs>(tab);
  const handleSetTab = useCallback(
    () =>
      setTab((prevTab) => {
        if (prevTab === EditConnectorTabs.Configuration) {
          return EditConnectorTabs.Test;
        }

        return EditConnectorTabs.Configuration;
      }),
    []
  );

  const [isFormModified, setIsFormModified] = useState<boolean>(false);

  const { preSubmitValidator, submit, isValid: isFormValid, isSubmitting } = formState;
  const hasErrors = isFormValid === false;
  const isSaving = isUpdatingConnector || isSubmitting || isExecutingConnector;

  const actionTypeModel: ActionTypeModel | null = actionTypeRegistry.get(connector.actionTypeId);

  const closeFlyout = useCallback(() => {
    onClose();
  }, [onClose]);

  const onClickSave = useCallback(
    async (closeAfterSave: boolean = true) => {
      const { isValid, data } = await submit();
      console.log('isValid', isValid);
      console.log('Form data:', data);
      // const { isValid, data } = await submit();

      if (!isMounted.current) {
        // User has closed the flyout meanwhile submitting the form
        return;
      }

      if (isValid) {
        if (preSubmitValidator) {
          const validatorRes = await preSubmitValidator();

          if (validatorRes) {
            setPreSubmitValidationErrorMessage(validatorRes.message);
            return;
          }
        }

        /**
         * At this point the form is valid
         * and there are no pre submit error messages.
         * For that reason, we clear the pre submit errors
         * in case they were set in a previous run.
         */
        setPreSubmitValidationErrorMessage(null);

        if (closeAfterSave) {
          closeFlyout();
        }

        if (reloadConnectors) {
          reloadConnectors();
        }
      }
    },
    [submit, preSubmitValidator, reloadConnectors, closeFlyout]
  );

  const onFormModifiedChange = useCallback(
    (formModified) => {
      setIsFormModified(formModified);
      setTestExecutionResult(none);
    },
    [setIsFormModified]
  );

  /**
   * Test connector
   */

  const [testExecutionActionParams, setTestExecutionActionParams] = useState<
    Record<string, unknown>
  >({});
  const [testExecutionResult, setTestExecutionResult] =
    useState<Option<ActionTypeExecutorResult<unknown> | undefined>>(none);

  const onExecutionAction = async () => {
    try {
      const res = await executeConnector({
        connectorId: connector.id,
        params: testExecutionActionParams,
      });

      setTestExecutionResult(some(res));
    } catch (error) {
      const result: ActionTypeExecutorResult<unknown> = isActionTypeExecutorResult(error)
        ? error
        : {
            actionId: connector.id,
            status: 'error',
            message: error.message,
          };
      setTestExecutionResult(some(result));
    }
  };

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutActionEditTitle" size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {actionTypeModel ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionTypeModel.iconClass} size="m" />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <FlyoutHeaderTitle
              isPreconfigured={connector.isPreconfigured}
              connectorName={connector.name}
              connectorTypeDesc={actionTypeModel.selectMessage}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiTabs className="connectorEditFlyoutTabs">
          <EuiTab
            onClick={handleSetTab}
            data-test-subj="configureConnectorTab"
            isSelected={EditConnectorTabs.Configuration === selectedTab}
          >
            {i18n.translate('xpack.triggersActionsUI.sections.editConnectorForm.tabText', {
              defaultMessage: 'Configuration',
            })}
          </EuiTab>
          <EuiTab
            onClick={handleSetTab}
            data-test-subj="testConnectorTab"
            isSelected={EditConnectorTabs.Test === selectedTab}
          >
            {i18n.translate('xpack.triggersActionsUI.sections.testConnectorForm.tabText', {
              defaultMessage: 'Test',
            })}
          </EuiTab>
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {selectedTab === EditConnectorTabs.Configuration ? (
          !connector.isPreconfigured ? (
            <>
              <ConnectorForm
                actionTypeModel={actionTypeModel}
                connector={getConnectorWithoutSecrets(connector)}
                isEdit={false}
                onChange={setFormState}
                onFormModifiedChange={onFormModifiedChange}
              />
              {preSubmitValidationErrorMessage}
            </>
          ) : (
            <ReadOnlyConnectorMessage href={docLinks.links.alerting.preconfiguredConnectors} />
          )
        ) : (
          <TestConnectorForm
            connector={connector}
            executeEnabled={!isFormModified}
            actionParams={testExecutionActionParams}
            setActionParams={setTestExecutionActionParams}
            onExecutionAction={onExecutionAction}
            isExecutingAction={isExecutingConnector}
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
                <>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      color="success"
                      data-test-subj="saveEditedActionButton"
                      isLoading={isSaving}
                      onClick={() => onClickSave(false)}
                      disabled={hasErrors || isSaving}
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
                      color="success"
                      data-test-subj="saveAndCloseEditedActionButton"
                      type="submit"
                      isLoading={isSaving}
                      onClick={() => onClickSave(true)}
                      disabled={hasErrors || isSaving}
                    >
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.editConnectorForm.saveAndCloseButtonLabel"
                        defaultMessage="Save & close"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                </>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const EditConnectorFlyout = memo(EditConnectorFlyoutComponent);
