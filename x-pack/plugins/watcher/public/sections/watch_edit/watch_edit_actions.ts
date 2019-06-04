/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';
import { get } from 'lodash';
import { ACTION_TYPES, WATCH_TYPES } from '../../../common/constants';
import { BaseWatch } from '../../../common/types/watch_types';
import { createWatch, loadWatch } from '../../lib/api';
import { goToWatchList } from '../../lib/navigation';

/**
 * Get the type from an action where a key defines its type.
 * eg: { email: { ... } } | { slack: { ... } }
 */
export function getTypeFromAction(action: { [key: string]: any }) {
  const actionKeys = Object.keys(action);
  let type;
  Object.keys(ACTION_TYPES).forEach(k => {
    if (actionKeys.includes(ACTION_TYPES[k])) {
      type = ACTION_TYPES[k];
    }
  });

  return type ? type : ACTION_TYPES.UNKNOWN;
}

function getPropsFromAction(type: string, action: { [key: string]: any }) {
  if (type === ACTION_TYPES.SLACK) {
    // Slack action has its props inside the "message" object
    return action[type].message;
  }

  if (type === ACTION_TYPES.JIRA) {
    // Jira action has its required props inside the "fields" object
    const jiraAction: { projectKey?: string; issueType?: string; summary?: string } = {};
    jiraAction.projectKey = get(action[type], 'fields.project.key');
    jiraAction.issueType = get(action[type], 'fields.issuetype.name');
    jiraAction.summary = get(action[type], 'fields.summary');
    return jiraAction;
  }
  return action[type];
}

/**
 * Actions instances are not automatically added to the Watch _actions_ Array
 * when we add them in the Json editor. This method takes takes care of it.
 */
function createActionsForWatch(watchInstance: BaseWatch) {
  watchInstance.resetActions();

  let action;
  let type;
  let actionProps;

  Object.keys(watchInstance.watch.actions).forEach(k => {
    action = watchInstance.watch.actions[k];
    type = getTypeFromAction(action);
    actionProps = { ...getPropsFromAction(type, action), ignoreDefaults: true };
    watchInstance.createAction(type, actionProps);
  });
  return watchInstance;
}

export async function saveWatch(watch: BaseWatch) {
  try {
    await createWatch(watch);
    toastNotifications.addSuccess(
      i18n.translate('xpack.watcher.sections.watchEdit.json.saveSuccessNotificationText', {
        defaultMessage: "Saved '{watchDisplayName}'",
        values: {
          watchDisplayName: watch.displayName,
        },
      })
    );
    goToWatchList();
  } catch (error) {
    return toastNotifications.addDanger(error.data.message);
  }
}

export async function validateActionsAndSaveWatch(watch: BaseWatch) {
  if (watch.type === WATCH_TYPES.JSON) {
    const actionsErrors = watch.actions.reduce((actionsErrorsAcc: any, action: any) => {
      if (action.validate) {
        const errors = action.validate();
        const errorKeys = Object.keys(errors);
        const hasErrors = !!errorKeys.find(errorKey => errors[errorKey].length >= 1);
        if (!hasErrors) {
          return actionsErrorsAcc;
        }
        const newErrors = errorKeys.map(errorKey => errors[errorKey]);
        const newErrorsFlattened = newErrors && newErrors.length ? [].concat(...newErrors) : [];

        return [...actionsErrorsAcc, ...newErrorsFlattened];
      }
      return actionsErrorsAcc;
    }, []);
    if (actionsErrors.length > 0) {
      return {
        validationError: {
          type: 'error',
          message: actionsErrors,
        },
      };
    }
    return saveWatch(watch);
  }
  return saveWatch(watch);
}

export async function onWatchSave(watch: BaseWatch): Promise<any> {
  const watchActions = watch.watch && watch.watch.actions;
  const watchData = watchActions ? createActionsForWatch(watch) : watch;
  if (!watchData.isNew) {
    return validateActionsAndSaveWatch(watch);
  }
  try {
    const existingWatch = await loadWatch(watchData.id);
    if (existingWatch) {
      return {
        validationError: {
          type: 'warning',
          title: i18n.translate(
            'xpack.watcher.sections.watchEdit.json.saveConfirmModal.existingWatchTitleText',
            {
              defaultMessage: 'A watch with this ID already exists',
            }
          ),
          message: i18n.translate(
            'xpack.watcher.sections.watchEdit.json.saveConfirmModal.existingWatchDescriptionText',
            {
              defaultMessage: 'Saving this watch will overwrite previous content.',
            }
          ),
          buttonLabel: i18n.translate(
            'xpack.watcher.sections.watchEdit.json.saveConfirmModal.existingWatchButtonLabel',
            {
              defaultMessage: 'Overwrite',
            }
          ),
          buttonType: 'danger',
        },
      };
    }
  } catch (error) {
    // Confirms watcher does not already exist
    if (error.status === 404) {
      return validateActionsAndSaveWatch(watchData);
    }
    return toastNotifications.addDanger(error.data.message);
  }
}
