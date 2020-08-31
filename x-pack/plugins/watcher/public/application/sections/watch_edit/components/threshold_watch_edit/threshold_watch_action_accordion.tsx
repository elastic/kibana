/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useContext, useState } from 'react';

import {
  EuiAccordion,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiForm,
  EuiCallOut,
  EuiLink,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { Action } from '../../../../models/action';
import { WatchHistoryItem } from '../../../../models/watch_history_item';
import { ThresholdWatch } from '../../../../models/watch/threshold_watch';
import { ExecuteDetails } from '../../../../models/execute_details';

import { ActionType } from '../../../../../../common/types/action_types';
import { ACTION_TYPES, ACTION_MODES } from '../../../../../../common/constants';
import { WatchContext } from '../../watch_context';

import {
  WebhookActionFields,
  LoggingActionFields,
  IndexActionFields,
  SlackActionFields,
  EmailActionFields,
  PagerDutyActionFields,
  JiraActionFields,
} from './action_fields';
import { executeWatch } from '../../../../lib/api';
import { SectionError } from '../../../../components';
import { useAppContext } from '../../../../app_context';

const actionFieldsComponentMap = {
  [ACTION_TYPES.LOGGING]: LoggingActionFields,
  [ACTION_TYPES.SLACK]: SlackActionFields,
  [ACTION_TYPES.EMAIL]: EmailActionFields,
  [ACTION_TYPES.INDEX]: IndexActionFields,
  [ACTION_TYPES.WEBHOOK]: WebhookActionFields,
  [ACTION_TYPES.PAGERDUTY]: PagerDutyActionFields,
  [ACTION_TYPES.JIRA]: JiraActionFields,
};

interface Props {
  settings: {
    actionTypes: {
      [key: string]: {
        enabled: boolean;
      };
    };
  } | null;
  actionErrors: {
    [key: string]: {
      [key: string]: string[];
    };
  };
}

export const WatchActionsAccordion: React.FunctionComponent<Props> = ({
  settings,
  actionErrors,
}) => {
  const {
    links: { watchActionsConfigurationMap },
    toasts,
  } = useAppContext();
  const { watch, setWatchProperty } = useContext(WatchContext);
  const { actions } = watch;

  const [isExecuting, setIsExecuting] = useState<{ [key: string]: boolean }>({});
  const [executeResultsError, setExecuteResultsError] = useState<any>(null);

  if (actions && actions.length >= 1) {
    return actions.map((action: any) => {
      const FieldsComponent = actionFieldsComponentMap[action.type] as any;
      const errors = actionErrors[action.id];
      const hasErrors = !!Object.keys(errors).find((errorKey) => errors[errorKey].length >= 1);

      return (
        <EuiAccordion
          initialIsOpen={action.isNew || hasErrors} // If an action contains errors in edit mode, we want the accordion open so the user is aware
          key={action.id}
          id={action.id}
          className="euiAccordionForm"
          buttonContentClassName="euiAccordionForm__button"
          data-test-subj="watchActionAccordion"
          buttonContent={
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type={action.iconClass} size="m" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s" className="euiAccordionForm__title">
                  <h6>{action.typeName}</h6>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          extraAction={
            <EuiButtonIcon
              iconType="cross"
              color="danger"
              className="euiAccordionForm__extraAction"
              aria-label={i18n.translate(
                'xpack.watcher.sections.watchEdit.threshold.accordion.deleteIconAriaLabel',
                {
                  defaultMessage: 'Delete',
                }
              )}
              onClick={() => {
                const updatedActions = actions.filter(
                  (actionItem: ActionType) => actionItem.id !== action.id
                );
                setWatchProperty('actions', updatedActions);
              }}
            />
          }
          paddingSize="l"
        >
          {executeResultsError && executeResultsError[action.id] && (
            <Fragment>
              <SectionError
                title={
                  <FormattedMessage
                    id="xpack.watcher.sections.watchEdit.threshold.accordion.simulateResultsErrorTitle"
                    defaultMessage="Error testing action"
                  />
                }
                error={executeResultsError[action.id]}
              />
              <EuiSpacer size="s" />
            </Fragment>
          )}
          <EuiForm>
            <FieldsComponent
              action={action}
              errors={errors}
              hasErrors={hasErrors}
              editAction={(changedProperty: { key: string; value: string }) => {
                const updatedActions = actions.map((actionItem: ActionType) => {
                  if (actionItem.id === action.id) {
                    const ActionTypes = Action.getActionTypes();
                    const ActionTypeModel = ActionTypes[action.type];
                    const { key, value } = changedProperty;
                    return new ActionTypeModel({ ...action, [key]: value });
                  }
                  return actionItem;
                });
                setWatchProperty('actions', updatedActions);
              }}
            >
              {settings && settings.actionTypes[action.type].enabled === false ? (
                <Fragment>
                  <EuiCallOut
                    title={i18n.translate(
                      'xpack.watcher.sections.watchEdit.threshold.actions.actionConfigurationWarningTitleText',
                      {
                        defaultMessage: 'Account may not be configured',
                      }
                    )}
                    color="warning"
                    iconType="help"
                  >
                    <EuiText>
                      <p>
                        <FormattedMessage
                          id="xpack.watcher.sections.watchEdit.threshold.actions.actionConfigurationWarningDescriptionText"
                          defaultMessage="To create this action, you must configure at least one {accountType} account. {docLink}"
                          values={{
                            accountType: action.typeName,
                            docLink: (
                              <EuiLink
                                href={watchActionsConfigurationMap[action.type]}
                                target="_blank"
                              >
                                <FormattedMessage
                                  id="xpack.watcher.sections.watchEdit.threshold.actions.actionConfigurationWarningHelpLinkText"
                                  defaultMessage="Learn more."
                                />
                              </EuiLink>
                            ),
                          }}
                        />
                      </p>
                    </EuiText>
                  </EuiCallOut>
                  <EuiSpacer />
                </Fragment>
              ) : null}
            </FieldsComponent>

            <EuiButton
              type="submit"
              isDisabled={hasErrors}
              isLoading={isExecuting[action.id]}
              data-test-subj="simulateActionButton"
              onClick={async () => {
                const selectedWatchAction = watch.actions.filter(
                  (watchAction: any) => watchAction.id === action.id
                );

                const executeDetails = new ExecuteDetails({
                  ignoreCondition: true,
                  recordExecution: false,
                  actionModes: {
                    [action.id]: ACTION_MODES.FORCE_EXECUTE,
                  },
                });

                const newExecuteWatch = new ThresholdWatch({
                  ...watch,
                  actions: selectedWatchAction,
                });

                setIsExecuting({ [action.id]: true });
                setExecuteResultsError(null);

                const { data, error } = await executeWatch(executeDetails, newExecuteWatch);

                setIsExecuting({ [action.id]: false });

                if (error) {
                  return setExecuteResultsError({ [action.id]: error });
                }

                const formattedResults = WatchHistoryItem.fromUpstreamJson(data.watchHistoryItem);
                const actionStatuses = formattedResults.watchStatus.actionStatuses;
                const actionStatus = actionStatuses.find(
                  (actionItem: ActionType) => actionItem.id === action.id
                );

                if (actionStatus && actionStatus.lastExecutionSuccessful === false) {
                  const message = actionStatus.lastExecutionReason || action.simulateFailMessage;
                  return toasts.addDanger(message);
                }
                return toasts.addSuccess(action.simulateMessage);
              }}
            >
              {action.simulatePrompt}
            </EuiButton>
          </EuiForm>
        </EuiAccordion>
      );
    });
  }
  return null;
};
