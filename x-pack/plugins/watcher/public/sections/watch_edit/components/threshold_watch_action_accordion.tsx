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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ExecuteDetails } from 'plugins/watcher/models/execute_details/execute_details';
import { Action } from 'plugins/watcher/models/action';
import { toastNotifications } from 'ui/notify';
import { WatchHistoryItem } from 'plugins/watcher/models/watch_history_item';
import { WatchAction } from '../../../../common/types/watch_types';
import { ACTION_TYPES, ACTION_MODES } from '../../../../common/constants';
import { WatchContext } from './watch_context';
import { LoggingActionFields } from './logging_action_fields';
import { executeWatch } from '../../../lib/api';

const ActionFieldsComponent = {
  [ACTION_TYPES.LOGGING]: LoggingActionFields,
  // TODO add support for additional action types
};

export const WatchActionsAccordion: React.FunctionComponent = () => {
  const { watch, setWatchProperty } = useContext(WatchContext);
  const { actions } = watch;

  const ButtonContent = ({
    name,
    iconClass,
  }: {
    name: string;
    iconClass: 'document' | 'logoWebhook' | 'logoSlack' | 'apps' | 'email';
  }) => (
    <Fragment>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconClass} size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s" className="euiAccordionForm__title">
            <h6>{name}</h6>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );

  const DeleteIcon = ({ onDelete }: { onDelete: () => void }) => (
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
      onClick={() => onDelete()}
    />
  );

  if (actions && actions.length >= 1) {
    return actions.map((action: WatchAction) => {
      const FieldsComponent = ActionFieldsComponent[action.type];
      return (
        <EuiAccordion
          initialIsOpen
          key={action.id}
          id={action.id}
          className="euiAccordionForm"
          buttonContentClassName="euiAccordionForm__button"
          buttonContent={<ButtonContent name={action.typeName} iconClass={action.iconClass} />}
          extraAction={
            <DeleteIcon
              onDelete={() => {
                const updatedActions = actions.filter(
                  (actionItem: WatchAction) => actionItem.id !== action.id
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
              editAction={changedProperty => {
                const updatedActions = actions.map((actionItem: WatchAction) => {
                  if (actionItem.id === action.id) {
                    const ActionTypes = Action.getActionTypes();
                    const ActionType = ActionTypes[action.type];
                    const { key, value } = changedProperty;
                    return new ActionType({ ...action, [key]: value });
                  }
                  return actionItem;
                });
                setWatchProperty('actions', updatedActions);
              }}
            />
            <EuiButton
              fill
              type="submit"
              isDisabled={false}
              onClick={async () => {
                const actionModes = watch.actions.reduce((acc: any, actionItem: WatchAction) => {
                  acc[action.id] =
                    action === actionItem ? ACTION_MODES.FORCE_EXECUTE : ACTION_MODES.SKIP;
                  return acc;
                }, {});
                const executeDetails = new ExecuteDetails({
                  ignoreCondition: true,
                  actionModes,
                  recordExecution: false,
                });
                try {
                  const executedWatch = await executeWatch(executeDetails, watch);
                  const executeResults = WatchHistoryItem.fromUpstreamJson(
                    executedWatch.watchHistoryItem
                  );
                  const actionStatuses = executeResults.watchStatus.actionStatuses;
                  const actionStatus = actionStatuses.find(
                    (actionItem: WatchAction) => actionItem.id === action.id
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
