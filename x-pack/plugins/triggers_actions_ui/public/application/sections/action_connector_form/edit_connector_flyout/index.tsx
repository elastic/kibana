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
} from '../../../../types';
import { ConnectorForm, CreateConnectorFormState } from '../connector_form';
import { Connector } from '../types';
import { useUpdateConnector } from '../../../hooks/use_edit_connector';
import { useKibana } from '../../../../common/lib/kibana';
import { hasSaveActionsCapability } from '../../../lib/capabilities';
import TestConnectorForm from '../test_connector_form';
import { useExecuteConnector } from '../../../hooks/use_execute_connector';
import { FlyoutHeader } from './header';
import { FlyoutFooter } from './foooter';

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
  const handleSetTab = useCallback((tabId: EditConnectorTabs) => setTab(tabId), []);

  const [isFormModified, setIsFormModified] = useState<boolean>(false);

  const { preSubmitValidator, submit, isValid: isFormValid, isSubmitting } = formState;
  const hasErrors = isFormValid === false;
  const isSaving = isUpdatingConnector || isSubmitting || isExecutingConnector;
  const actionTypeModel: ActionTypeModel | null = actionTypeRegistry.get(connector.actionTypeId);
  const showButtons = canSave && actionTypeModel && !connector.isPreconfigured;

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

  const onSubmit = useCallback(() => onClickSave(false), []);
  const onSubmitAndClose = useCallback(() => onClickSave(true), []);

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
      <FlyoutHeader
        isPreconfigured={connector.isPreconfigured}
        connectorName={connector.name}
        connectorTypeDesc={actionTypeModel.selectMessage}
        setTab={handleSetTab}
        selectedTab={selectedTab}
        icon={actionTypeModel?.iconClass}
      />
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
      <FlyoutFooter
        isSaving={isSaving}
        disabled={hasErrors || isSaving}
        showButtons={showButtons}
        onCancel={closeFlyout}
        onSubmit={onSubmit}
        onSubmitAndClose={onSubmitAndClose}
      />
    </EuiFlyout>
  );
};

export const EditConnectorFlyout = memo(EditConnectorFlyoutComponent);
