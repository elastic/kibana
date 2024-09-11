/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { ActionConnectorMode } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiTextArea, EuiFormRow } from '@elastic/eui';
import { DEFAULTS_BY_TASK_TYPE } from './constants';
import * as i18n from './translations';
import { SUB_ACTION } from '../../../common/inference/constants';
import { InferenceActionConnector, InferenceActionParams } from './types';

const InferenceServiceParamsFields: React.FunctionComponent<
  ActionParamsProps<InferenceActionParams>
> = ({
  actionParams,
  editAction,
  index,
  messageVariables,
  executionMode,
  errors,
  actionConnector,
}) => {
  const { subAction, subActionParams } = actionParams;

  const { provider, taskType } = (actionConnector as unknown as InferenceActionConnector).config;

  const { input } = subActionParams ?? {};

  const isTest = useMemo(() => executionMode === ActionConnectorMode.Test, [executionMode]);

  useEffect(() => {
    if (!subAction) {
      editAction('subAction', taskType, index);
    }
  }, [editAction, index, subAction, taskType]);

  useEffect(() => {
    if (!subActionParams) {
      editAction(
        'subActionParams',
        {
          ...(DEFAULTS_BY_TASK_TYPE[taskType as SUB_ACTION] ?? {}),
        },
        index
      );
    }
  }, [editAction, index, subActionParams, taskType]);

  const editSubActionParams = useCallback(
    (params: Partial<InferenceActionParams['subActionParams']>) => {
      editAction('subActionParams', { ...subActionParams, ...params }, index);
    },
    [editAction, index, subActionParams]
  );

  return (
    <>
      <EuiFormRow fullWidth error={errors.input} isInvalid={false} label={i18n.INPUT}>
        <EuiTextArea
          data-test-subj="inferenceInput"
          name="input"
          value={input}
          onChange={(e) => {
            editSubActionParams({ input: e.target.value });
          }}
          isInvalid={false}
          fullWidth={true}
        />
      </EuiFormRow>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { InferenceServiceParamsFields as default };
