/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import {
  JsonEditorWithMessageVariables,
  type ActionParamsProps,
} from '@kbn/triggers-actions-ui-plugin/public';
import { EuiTextArea, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { RuleFormParamsErrors } from '@kbn/alerts-ui-shared';
import {
  ChatCompleteParams,
  RerankParams,
  SparseEmbeddingParams,
  TextEmbeddingParams,
} from '../../../common/inference/types';
import { DEFAULTS_BY_TASK_TYPE } from './constants';
import * as i18n from './translations';
import { SUB_ACTION } from '../../../common/inference/constants';
import { InferenceActionConnector, InferenceActionParams } from './types';

const InferenceServiceParamsFields: React.FunctionComponent<
  ActionParamsProps<InferenceActionParams>
> = ({ actionParams, editAction, index, errors, actionConnector }) => {
  const { subAction, subActionParams } = actionParams;

  const { taskType } = (actionConnector as unknown as InferenceActionConnector).config;

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
          ...(DEFAULTS_BY_TASK_TYPE[taskType] ?? {}),
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

  // ChatCompleteParams | RerankParams | SparseEmbeddingParams | TextEmbeddingParams

  if (subAction === SUB_ACTION.COMPLETION) {
    return (
      <CompletionParamsFields
        errors={errors}
        editSubActionParams={editSubActionParams}
        subActionParams={subActionParams as ChatCompleteParams}
      />
    );
  }

  if (subAction === SUB_ACTION.RERANK) {
    return (
      <RerankParamsFields
        errors={errors}
        editSubActionParams={editSubActionParams}
        subActionParams={subActionParams as RerankParams}
      />
    );
  }

  if (subAction === SUB_ACTION.SPARSE_EMBEDDING) {
    return (
      <SparseEmbeddingParamsFields
        errors={errors}
        editSubActionParams={editSubActionParams}
        subActionParams={subActionParams as SparseEmbeddingParams}
      />
    );
  }

  if (subAction === SUB_ACTION.TEXT_EMBEDDING) {
    return (
      <TextEmbeddingParamsFields
        errors={errors}
        editSubActionParams={editSubActionParams}
        subActionParams={subActionParams as TextEmbeddingParams}
      />
    );
  }

  return <></>;
};

const CompletionParamsFields: React.FunctionComponent<{
  subActionParams: ChatCompleteParams;
  errors: RuleFormParamsErrors;
  editSubActionParams: (params: Partial<InferenceActionParams['subActionParams']>) => void;
}> = ({ subActionParams, editSubActionParams, errors }) => {
  const { input } = subActionParams;

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

const SparseEmbeddingParamsFields: React.FunctionComponent<{
  subActionParams: SparseEmbeddingParams;
  errors: RuleFormParamsErrors;
  editSubActionParams: (params: Partial<InferenceActionParams['subActionParams']>) => void;
}> = ({ subActionParams, editSubActionParams, errors }) => {
  const { input } = subActionParams;

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

const TextEmbeddingParamsFields: React.FunctionComponent<{
  subActionParams: TextEmbeddingParams;
  errors: RuleFormParamsErrors;
  editSubActionParams: (params: Partial<InferenceActionParams['subActionParams']>) => void;
}> = ({ subActionParams, editSubActionParams, errors }) => {
  const { input, inputType } = subActionParams;

  return (
    <>
      <EuiFormRow fullWidth error={errors.input} isInvalid={false} label={i18n.INPUT}>
        <EuiTextArea
          data-test-subj="inferenceInputType"
          name="inputType"
          value={inputType}
          onChange={(e) => {
            editSubActionParams({ inputType: e.target.value });
          }}
          isInvalid={false}
          fullWidth={true}
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
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

const RerankParamsFields: React.FunctionComponent<{
  subActionParams: RerankParams;
  errors: RuleFormParamsErrors;
  editSubActionParams: (params: Partial<InferenceActionParams['subActionParams']>) => void;
}> = ({ subActionParams, editSubActionParams, errors }) => {
  const { input, query } = subActionParams;

  return (
    <>
      <JsonEditorWithMessageVariables
        paramsProperty={'input'}
        inputTargetValue={JSON.stringify(input)}
        label={i18n.INPUT}
        errors={errors.input as string[]}
        onDocumentsChange={(json: string) => {
          editSubActionParams({ input: json.trim() });
        }}
        onBlur={() => {
          if (!input) {
            editSubActionParams({ input: [] });
          }
        }}
        dataTestSubj="inference-rerank-inputJsonEditor"
      />
      <EuiSpacer size="s" />
      <EuiFormRow fullWidth error={errors.input} isInvalid={false} label={i18n.QUERY}>
        <EuiTextArea
          data-test-subj="inferenceQuery"
          name="query"
          value={query}
          onChange={(e) => {
            editSubActionParams({ query: e.target.value });
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
