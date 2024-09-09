/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import {
  ActionConnectorMode,
  JsonEditorWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import { DEFAULT_CHAT_COMPLETE_BODY } from './constants';
import * as i18n from './translations';
import { SUB_ACTION } from '../../../common/inference/constants';
import { InferenceActionParams } from './types';

const InferenceServiceParamsFields: React.FunctionComponent<
  ActionParamsProps<InferenceActionParams>
> = ({ actionParams, editAction, index, messageVariables, executionMode, errors }) => {
  const { subAction, subActionParams } = actionParams;

  const { input, model } = subActionParams ?? {};

  const isTest = useMemo(() => executionMode === ActionConnectorMode.Test, [executionMode]);

  useEffect(() => {
    if (!subAction) {
      editAction('subAction', isTest ? SUB_ACTION.TEST : SUB_ACTION.INVOKE, index);
    }
  }, [editAction, index, isTest, subAction]);

  useEffect(() => {
    if (!subActionParams) {
      editAction(
        'subActionParams',
        {
          body: DEFAULT_CHAT_COMPLETE_BODY,
        },
        index
      );
    }
  }, [editAction, index, subActionParams]);

  useEffect(() => {
    return () => {
      // some gemini specific formatting gets messed up if we do not reset
      // subActionParams on dismount (switching tabs between test and config)
      editAction('subActionParams', undefined, index);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editSubActionParams = useCallback(
    (params: Partial<InferenceActionParams['subActionParams']>) => {
      editAction('subActionParams', { ...subActionParams, ...params }, index);
    },
    [editAction, index, subActionParams]
  );

  return (
    <JsonEditorWithMessageVariables
      messageVariables={messageVariables}
      paramsProperty={'body'}
      // inputTargetValue={{}}
      label={i18n.BODY}
      ariaLabel={i18n.BODY_DESCRIPTION}
      errors={errors.body as string[]}
      onDocumentsChange={(json: string) => {
        editSubActionParams({ input: json });
      }}
      onBlur={() => {
        if (!input) {
          editSubActionParams({ input: '' });
        }
      }}
      dataTestSubj="genAi-bodyJsonEditor"
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { InferenceServiceParamsFields as default };
