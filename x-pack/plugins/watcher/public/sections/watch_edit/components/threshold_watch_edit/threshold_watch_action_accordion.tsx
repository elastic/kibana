/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useContext } from 'react';

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
import { ExecuteDetails } from 'plugins/watcher/models/execute_details/execute_details';
import { Action } from 'plugins/watcher/models/action';
import { toastNotifications } from 'ui/notify';
import { WatchHistoryItem } from 'plugins/watcher/models/watch_history_item';
import { ThresholdWatch } from 'plugins/watcher/models/watch/threshold_watch';
import { ActionType } from '../../../../../common/types/action_types';
import { ACTION_TYPES, ACTION_MODES } from '../../../../../common/constants';
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
import { watchActionsConfigurationMap } from '../../../../lib/documentation_links';

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
  const { watch, setWatchProperty } = useContext(WatchContext);
  const { actions } = watch;

  if (actions && actions.length >= 1) {
    return actions.map((action: any) => {
      const FieldsComponent = actionFieldsComponentMap[action.type];
      const errors = actionErrors[action.id];
      const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);

      return (
        <EuiAccordion
          initialIsOpen={action.isNew}
          key={action.id}
          id={action.id}
          className="euiAccordionForm"
          buttonContentClassName="euiAccordionForm__button"
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
                        defaultMessage: 'Account may not be configured.',
                      }
                    )}
                    color="warning"
                    iconType="help"
                  >
                    <EuiText>
                      <p>
                        <FormattedMessage
                          id="xpack.watcher.sections.watchEdit.threshold.actions.actionConfigurationWarningDescriptionText"
                          defaultMessage="To create this action, at least one {accountType} account must be configured. {docLink}"
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
                try {
                  const executedWatch = await executeWatch(executeDetails, newExecuteWatch);
                  const executeResults = WatchHistoryItem.fromUpstreamJson(
                    executedWatch.watchHistoryItem
                  );
                  const actionStatuses = executeResults.watchStatus.actionStatuses;
                  const actionStatus = actionStatuses.find(
                    (actionItem: ActionType) => actionItem.id === action.id
                  );

                  if (actionStatus.lastExecutionSuccessful === false) {
                    const message = actionStatus.lastExecutionReason || action.simulateFailMessage;
                    return toastNotifications.addDanger(message);
                  }
                  toastNotifications.addSuccess(action.simulateMessage);
                } catch (e) {
                  toastNotifications.addDanger(e.data.message);
                }
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
