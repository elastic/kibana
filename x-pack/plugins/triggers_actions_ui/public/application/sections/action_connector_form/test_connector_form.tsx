/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, Suspense } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
  EuiSteps,
  EuiLoadingSpinner,
  EuiDescriptionList,
  EuiCallOut,
  EuiSpacer,
  EuiErrorBoundary,
} from '@elastic/eui';
import { Option, map, getOrElse } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { ActionConnector, ActionTypeRegistryContract, IErrorObject } from '../../../types';
import { ActionTypeExecutorResult } from '../../../../../actions/common';

export interface ConnectorAddFlyoutProps {
  connector: ActionConnector;
  executeEnabled: boolean;
  isExecutingAction: boolean;
  setActionParams: (params: Record<string, unknown>) => void;
  actionParams: Record<string, unknown>;
  onExecutAction: () => Promise<ActionTypeExecutorResult<unknown>>;
  executionResult: Option<ActionTypeExecutorResult<unknown>>;
  actionTypeRegistry: ActionTypeRegistryContract;
}

export const TestConnectorForm = ({
  connector,
  executeEnabled,
  executionResult,
  actionParams,
  setActionParams,
  onExecutAction,
  isExecutingAction,
  actionTypeRegistry,
}: ConnectorAddFlyoutProps) => {
  const actionTypeModel = actionTypeRegistry.get(connector.actionTypeId);
  const ParamsFieldsComponent = actionTypeModel.actionParamsFields;

  const actionErrors = actionTypeModel?.validateParams(actionParams).errors as IErrorObject;
  const hasErrors = !!Object.values(actionErrors).find((errors) => errors.length > 0);

  const steps = [
    {
      title: 'Create an action',
      children: ParamsFieldsComponent ? (
        <EuiErrorBoundary>
          <Suspense
            fallback={
              <EuiFlexGroup justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="m" />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <ParamsFieldsComponent
              actionParams={actionParams}
              index={0}
              errors={actionErrors}
              editAction={(field, value) =>
                setActionParams({
                  ...actionParams,
                  [field]: value,
                })
              }
              messageVariables={[]}
              actionConnector={connector}
            />
          </Suspense>
        </EuiErrorBoundary>
      ) : (
        <EuiText>
          <p>This Connector does not require any Action Parameter.</p>
        </EuiText>
      ),
    },
    {
      title: 'Run the action',
      children: (
        <Fragment>
          {executeEnabled ? null : (
            <Fragment>
              <EuiCallOut iconType="alert" color="warning">
                <p>
                  <FormattedMessage
                    defaultMessage="Save your changes before testing the connector."
                    id="xpack.triggersActionsUI.sections.testConnectorForm.executeTestDisabled"
                  />
                </p>
              </EuiCallOut>
              <EuiSpacer size="s" />
            </Fragment>
          )}
          <EuiText>
            <EuiButton
              iconType={'play'}
              isLoading={isExecutingAction}
              isDisabled={!executeEnabled || hasErrors || isExecutingAction}
              data-test-subj="executeActionButton"
              onClick={onExecutAction}
            >
              <FormattedMessage
                defaultMessage="Run"
                id="xpack.triggersActionsUI.sections.testConnectorForm.executeTestButton"
              />
            </EuiButton>
          </EuiText>
        </Fragment>
      ),
    },
    {
      title: 'Results',
      children: pipe(
        executionResult,
        map((result) =>
          result.status === 'ok' ? (
            <SuccessfulExecution />
          ) : (
            <FailedExecussion executionResult={result} />
          )
        ),
        getOrElse(() => <AwaitingExecution />)
      ),
    },
  ];

  return <EuiSteps steps={steps} />;
};

const AwaitingExecution = () => (
  <EuiCallOut data-test-subj="executionAwaiting">
    <p>
      <FormattedMessage
        defaultMessage="When you run the action, the results will show up here."
        id="xpack.triggersActionsUI.sections.testConnectorForm.awaitingExecutionDescription"
      />
    </p>
  </EuiCallOut>
);

const SuccessfulExecution = () => (
  <EuiCallOut
    title={i18n.translate(
      'xpack.triggersActionsUI.sections.testConnectorForm.executionSuccessfulTitle',
      {
        defaultMessage: 'Action was successful',
        values: {},
      }
    )}
    color="success"
    data-test-subj="executionSuccessfulResult"
    iconType="check"
  >
    <p>
      <FormattedMessage
        defaultMessage="Ensure the results are what you expect."
        id="xpack.triggersActionsUI.sections.testConnectorForm.executionSuccessfulDescription"
      />
    </p>
  </EuiCallOut>
);

const FailedExecussion = ({
  executionResult: { message, serviceMessage },
}: {
  executionResult: ActionTypeExecutorResult<unknown>;
}) => {
  const items = [
    {
      title: i18n.translate(
        'xpack.triggersActionsUI.sections.testConnectorForm.executionFailureDescription',
        {
          defaultMessage: 'The following error was found:',
        }
      ),
      description:
        message ??
        i18n.translate(
          'xpack.triggersActionsUI.sections.testConnectorForm.executionFailureUnknownReason',
          {
            defaultMessage: 'Unknown reason',
          }
        ),
    },
  ];
  if (serviceMessage) {
    items.push({
      title: i18n.translate(
        'xpack.triggersActionsUI.sections.testConnectorForm.executionFailureAdditionalDetails',
        {
          defaultMessage: 'Details:',
        }
      ),
      description: serviceMessage,
    });
  }
  return (
    <EuiCallOut
      title={i18n.translate(
        'xpack.triggersActionsUI.sections.testConnectorForm.executionFailureTitle',
        {
          defaultMessage: 'Action failed to run',
        }
      )}
      data-test-subj="executionFailureResult"
      color="danger"
      iconType="alert"
    >
      <EuiDescriptionList textStyle="reverse" listItems={items} />
    </EuiCallOut>
  );
};

// eslint-disable-next-line import/no-default-export
export { TestConnectorForm as default };
