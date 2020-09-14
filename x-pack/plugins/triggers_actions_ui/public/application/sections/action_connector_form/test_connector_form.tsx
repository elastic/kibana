/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Suspense } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
  EuiSteps,
  EuiLoadingSpinner,
  EuiDescriptionList,
  EuiCallOut,
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import { Option, map, getOrElse } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { ActionConnector } from '../../../types';
import { useActionsConnectorsContext } from '../../context/actions_connectors_context';
import { ActionTypeExecutorResult } from '../../../../../actions/common';

export interface ConnectorAddFlyoutProps {
  connector: ActionConnector;
  executeEnabled: boolean;
  isExecutingAction: boolean;
  setActionParams: (params: Record<string, unknown>) => void;
  actionParams: Record<string, unknown>;
  onExecutAction: () => Promise<ActionTypeExecutorResult<unknown>>;
  executionResult: Option<ActionTypeExecutorResult<unknown>>;
}

export const TestConnectorForm = ({
  connector,
  executeEnabled,
  executionResult,
  actionParams,
  setActionParams,
  onExecutAction,
  isExecutingAction,
}: ConnectorAddFlyoutProps) => {
  const { actionTypeRegistry, docLinks } = useActionsConnectorsContext();
  const actionTypeModel = actionTypeRegistry.get(connector.actionTypeId);
  const ParamsFieldsComponent = actionTypeModel.actionParamsFields;

  const actionErrors = actionTypeModel?.validateParams(actionParams);
  const hasErrors = !!Object.values(actionErrors.errors).find((errors) => errors.length > 0);

  const steps = [
    {
      title: 'Fill out an example action',
      children: ParamsFieldsComponent ? (
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
            errors={actionErrors.errors}
            editAction={(field, value) =>
              setActionParams({
                ...actionParams,
                [field]: value,
              })
            }
            messageVariables={[]}
            docLinks={docLinks}
            actionConnector={connector}
          />
        </Suspense>
      ) : (
        <EuiText>
          <p>This Connector does not require any Action Parameter.</p>
        </EuiText>
      ),
    },
    {
      title: 'Execute the example action',
      children: (
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiText>
              <EuiButton
                iconType={'play'}
                isLoading={isExecutingAction}
                isDisabled={!executeEnabled || hasErrors || isExecutingAction}
                data-test-subj="executeActionButton"
                onClick={onExecutAction}
              >
                <FormattedMessage
                  defaultMessage="Execute"
                  id="xpack.triggersActionsUI.sections.testConnectorForm.executeTestButton"
                />
              </EuiButton>
            </EuiText>
          </EuiFlexItem>
          {executeEnabled ? null : (
            <EuiFlexItem>
              <EuiCallOut iconType="alert" size="s" color="warning">
                <p>
                  <FormattedMessage
                    defaultMessage="Unsaved changes must be saved before the connector can be tested"
                    id="xpack.triggersActionsUI.sections.testConnectorForm.executeTestDisabled"
                  />
                </p>
              </EuiCallOut>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
    },
    {
      title: 'Execution Result',
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
  <EuiCallOut
    title={i18n.translate(
      'xpack.triggersActionsUI.sections.testConnectorForm.awaitingExecutionTitle',
      {
        defaultMessage: 'Awaiting Action Parameters',
        values: {},
      }
    )}
    data-test-subj="executionAwaiting"
    iconType="search"
  >
    <p>
      <FormattedMessage
        defaultMessage="Once you provide the Action Parameters by filling out the form above, you may execute the action and the result will be displayed here."
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
        defaultMessage: 'Success',
        values: {},
      }
    )}
    color="success"
    data-test-subj="executionSuccessfulResult"
    iconType="play"
  >
    <p>
      <FormattedMessage
        defaultMessage="This action was successfully executed. We recommend you ensure the action has resulted in the expected effect."
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
          defaultMessage:
            'This action has failed to execute and has resulted in the following message:',
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
          defaultMessage: 'Some additional details have been provided by the action:',
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
          defaultMessage: 'Error',
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
