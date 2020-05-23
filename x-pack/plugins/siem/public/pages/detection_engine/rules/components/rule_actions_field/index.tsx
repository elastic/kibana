/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState } from 'react';
import deepMerge from 'deepmerge';

import { NOTIFICATION_SUPPORTED_ACTION_TYPES_IDS } from '../../../../../../common/constants';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { loadActionTypes } from '../../../../../../../triggers_actions_ui/public/application/lib/action_connector_api';
import { SelectField } from '../../../../../shared_imports';
import { ActionForm, ActionType } from '../../../../../../../triggers_actions_ui/public';
import { AlertAction } from '../../../../../../../alerting/common';
import { useKibana } from '../../../../../lib/kibana';

type ThrottleSelectField = typeof SelectField;

const DEFAULT_ACTION_GROUP_ID = 'default';
const DEFAULT_ACTION_MESSAGE =
  'Rule {{context.rule.name}} generated {{state.signals_count}} signals';

export const RuleActionsField: ThrottleSelectField = ({ field, messageVariables }) => {
  const [supportedActionTypes, setSupportedActionTypes] = useState<ActionType[] | undefined>();
  const {
    http,
    triggers_actions_ui: { actionTypeRegistry },
    notifications,
  } = useKibana().services;

  const setActionIdByIndex = useCallback(
    (id: string, index: number) => {
      const updatedActions = [...(field.value as Array<Partial<AlertAction>>)];
      updatedActions[index] = deepMerge(updatedActions[index], { id });
      field.setValue(updatedActions);
    },
    [field]
  );

  const setAlertProperty = useCallback(
    (updatedActions: AlertAction[]) => field.setValue(updatedActions),
    [field]
  );

  const setActionParamsProperty = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: string, value: any, index: number) => {
      const updatedActions = [...(field.value as AlertAction[])];
      updatedActions[index].params[key] = value;
      field.setValue(updatedActions);
    },
    [field]
  );

  useEffect(() => {
    (async function() {
      const actionTypes = await loadActionTypes({ http });
      const supportedTypes = actionTypes.filter(actionType =>
        NOTIFICATION_SUPPORTED_ACTION_TYPES_IDS.includes(actionType.id)
      );
      setSupportedActionTypes(supportedTypes);
    })();
  }, []);

  if (!supportedActionTypes) return <></>;

  return (
    <ActionForm
      actions={field.value as AlertAction[]}
      messageVariables={messageVariables}
      defaultActionGroupId={DEFAULT_ACTION_GROUP_ID}
      setActionIdByIndex={setActionIdByIndex}
      setAlertProperty={setAlertProperty}
      setActionParamsProperty={setActionParamsProperty}
      http={http}
      actionTypeRegistry={actionTypeRegistry}
      actionTypes={supportedActionTypes}
      defaultActionMessage={DEFAULT_ACTION_MESSAGE}
      toastNotifications={notifications.toasts}
    />
  );
};
