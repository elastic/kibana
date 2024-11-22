/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { SUB_ACTION } from '../../../common/sentinelone/constants';
import type { SentinelOneActionParams } from '../../../common/sentinelone/types';
import type { SentinelOneExecuteSubActionParams } from './types';
import * as i18n from './translations';

const SentinelOneParamsFields: React.FunctionComponent<
  ActionParamsProps<SentinelOneActionParams>
> = ({ actionConnector, actionParams, editAction, index, executionMode, errors, ...rest }) => {
  const { subAction, subActionParams } = actionParams;

  const [subActionValue, setSubActionValue] = useState<string | undefined>(
    subAction ?? SUB_ACTION.GET_AGENTS
  );
  const setDefaultValues = async () => {
    editSubActionParams({});
    editAction('subAction', subActionValue, index);
  };
  useEffect(() => {
    setDefaultValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editSubActionParams = useCallback(
    (params: Partial<SentinelOneExecuteSubActionParams>) => {
      editAction('subActionParams', { ...subActionParams, ...params }, index);
    },
    [editAction, index, subActionParams]
  );

  const actionTypeOptions = [
    {
      value: SUB_ACTION.GET_AGENTS,
      inputDisplay: i18n.GET_AGENT_ACTION_LABEL,
    },
  ];

  const handleEditSubAction = useCallback(
    (payload) => {
      if (subAction !== payload) {
        editSubActionParams({});
        editAction('subAction', payload, index);
        setSubActionValue(payload);
      }
    },
    [editAction, editSubActionParams, index, subAction]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFormRow fullWidth label={i18n.ACTION_TYPE_LABEL}>
          <EuiSuperSelect
            fullWidth
            options={actionTypeOptions}
            valueOfSelected={subActionValue}
            onChange={handleEditSubAction}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export { SentinelOneParamsFields as default };
