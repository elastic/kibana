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
import { OpenAiProviderType, SUB_ACTION } from '../../../common/openai/constants';
import { DEFAULT_BODY, DEFAULT_BODY_AZURE } from './constants';
import { OpenAIActionConnector, ActionParams } from './types';

const ParamsFields: React.FunctionComponent<ActionParamsProps<ActionParams>> = ({
  actionConnector,
  actionParams,
  editAction,
  index,
  messageVariables,
  executionMode,
  errors,
}) => {
  const { subAction, subActionParams } = actionParams;

  const { body } = subActionParams ?? {};

  const typedActionConnector = actionConnector as unknown as OpenAIActionConnector;

  const isTest = useMemo(() => executionMode === ActionConnectorMode.Test, [executionMode]);

  useEffect(() => {
    if (!subAction) {
      editAction('subAction', isTest ? SUB_ACTION.TEST : SUB_ACTION.RUN, index);
    }
  }, [editAction, index, isTest, subAction]);

  useEffect(() => {
    if (!subActionParams) {
      // default to OpenAiProviderType.OpenAi sample data
      let sampleBody = DEFAULT_BODY;

      if (typedActionConnector?.config?.apiProvider === OpenAiProviderType.AzureAi) {
        // update sample data if AzureAi
        sampleBody = DEFAULT_BODY_AZURE;
      }
      editAction('subActionParams', { body: sampleBody }, index);
    }
  }, [typedActionConnector?.config?.apiProvider, editAction, index, subActionParams]);

  const editSubActionParams = useCallback(
    (params: ActionParams['subActionParams']) => {
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
      ariaLabel={i18n.translate('xpack.stackConnectors.components.genAi.bodyCodeEditorAriaLabel', {
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
      dataTestSubj="genAi-bodyJsonEditor"
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { ParamsFields as default };
