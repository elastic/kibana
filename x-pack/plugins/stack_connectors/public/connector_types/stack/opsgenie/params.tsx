/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { ActionParamsProps, ActionConnectorMode } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { isEmpty, unset, cloneDeep } from 'lodash';
import { OpsgenieSubActions } from '../../../../common';
import type { OpsgenieActionParams } from '../../../../server/connector_types/stack';
import * as i18n from './translations';
import { CreateAlert } from './create_alert';
import { CloseAlert } from './close_alert';

const actionOptions = [
  {
    value: OpsgenieSubActions.CreateAlert,
    text: i18n.CREATE_ALERT_ACTION,
    'data-test-subj': 'opsgenie-subActionSelect-create-alert',
  },
  {
    value: OpsgenieSubActions.CloseAlert,
    text: i18n.CLOSE_ALERT_ACTION,
    'data-test-subj': 'opsgenie-subActionSelect-close-alert',
  },
];

const OpsgenieParamFields: React.FC<ActionParamsProps<OpsgenieActionParams>> = ({
  actionParams,
  editAction,
  errors,
  index,
  messageVariables,
  executionMode,
}) => {
  const { subAction, subActionParams } = actionParams;

  const currentSubAction = useRef<string>(subAction ?? OpsgenieSubActions.CreateAlert);

  const onActionChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      editAction('subAction', event.target.value, index);
    },
    [editAction, index]
  );

  const editOptionalSubAction = useCallback(
    (key, value) => {
      if (isEmpty(value)) {
        const paramsCopy = cloneDeep(subActionParams);
        unset(paramsCopy, key);
        editAction('subActionParams', paramsCopy, index);
        return;
      }

      editAction('subActionParams', { ...subActionParams, [key]: value }, index);
    },
    [editAction, index, subActionParams]
  );

  const editSubAction = useCallback(
    (key, value) => {
      editAction('subActionParams', { ...subActionParams, [key]: value }, index);
    },
    [editAction, index, subActionParams]
  );

  useEffect(() => {
    if (!subAction) {
      editAction('subAction', OpsgenieSubActions.CreateAlert, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, subAction]);

  useEffect(() => {
    if (subAction != null && currentSubAction.current !== subAction) {
      currentSubAction.current = subAction;
      const params = subActionParams?.alias ? { alias: subActionParams.alias } : undefined;
      editAction('subActionParams', params, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subAction, currentSubAction]);

  return (
    <>
      {executionMode === ActionConnectorMode.Test && (
        <EuiFormRow fullWidth label={i18n.ACTION_LABEL}>
          <EuiSelect
            fullWidth
            data-test-subj="opsgenie-subActionSelect"
            options={actionOptions}
            hasNoInitialSelection={subAction == null}
            value={subAction}
            onChange={onActionChange}
          />
        </EuiFormRow>
      )}

      {subAction != null && subAction === OpsgenieSubActions.CreateAlert && (
        <CreateAlert
          subActionParams={subActionParams}
          editAction={editAction}
          editSubAction={editSubAction}
          editOptionalSubAction={editOptionalSubAction}
          errors={errors}
          index={index}
          messageVariables={messageVariables}
        />
      )}

      {subAction != null && subAction === OpsgenieSubActions.CloseAlert && (
        <CloseAlert
          subActionParams={subActionParams}
          editSubAction={editSubAction}
          editOptionalSubAction={editOptionalSubAction}
          errors={errors}
          index={index}
          messageVariables={messageVariables}
        />
      )}
    </>
  );
};

OpsgenieParamFields.displayName = 'OpsgenieParamFields';

// eslint-disable-next-line import/no-default-export
export { OpsgenieParamFields as default };
