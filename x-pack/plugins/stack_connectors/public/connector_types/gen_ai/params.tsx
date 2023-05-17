/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import {
  ActionConnectorMode,
  JsonEditorWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import { SUB_ACTION } from '../../../common/gen_ai/constants';
import { GenerativeAiActionParams } from '../types';

const GenerativeAiParamsFields: React.FunctionComponent<
  ActionParamsProps<GenerativeAiActionParams>
> = ({ actionParams, editAction, index, messageVariables, executionMode, errors }) => {
  const { subAction, subActionParams } = actionParams;
  const { body } = subActionParams ?? {};

  const isTest = useMemo(() => executionMode === ActionConnectorMode.Test, [executionMode]);

  useEffect(() => {
    if (!subAction) {
      editAction('subAction', isTest ? SUB_ACTION.TEST : SUB_ACTION.RUN, index);
    }
  }, [editAction, index, isTest, subAction]);

  useEffect(() => {
    if (!subActionParams) {
      const params = subActionParams?.body ? { body: subActionParams.body } : undefined;
      editAction('subActionParams', params, index);
      editAction('subActionParams', {}, index);
    }
  }, [editAction, index, subActionParams]);

  const editSubActionParams = useCallback(
    (params: GenerativeAiActionParams['subActionParams']) => {
      editAction('subActionParams', { ...subActionParams, ...params }, index);
    },
    [editAction, index, subActionParams]
  );

  return (
    <JsonEditorWithMessageVariables
      messageVariables={messageVariables}
      paramsProperty={'body'}
      inputTargetValue={body}
      label={i18n.translate('xpack.stackConnectors.components.genAi.bodyFieldLabel', {
        defaultMessage: 'Body',
      })}
      aria-label={i18n.translate('xpack.stackConnectors.components.genAi.bodyCodeEditorAriaLabel', {
        defaultMessage: 'Code editor',
      })}
      errors={errors.body as string[]}
      onDocumentsChange={(json: string) => {
        editSubActionParams({ body: json });
      }}
      onBlur={() => {
        if (!body) {
          editSubActionParams({ body: '' });
        }
      }}
      data-test-subj="genAi-bodyJsonEditor"
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { GenerativeAiParamsFields as default };
