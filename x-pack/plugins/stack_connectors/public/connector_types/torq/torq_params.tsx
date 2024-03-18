/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionParamsProps,
  JsonEditorWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import { TorqActionParams } from '../types';
import * as i18n from './translations';

const TorqParamsFields: React.FunctionComponent<ActionParamsProps<TorqActionParams>> = ({
  actionParams,
  editAction,
  index,
  messageVariables,
  errors,
}) => {
  const { body } = actionParams;
  return (
    <JsonEditorWithMessageVariables
      messageVariables={messageVariables}
      paramsProperty={'body'}
      inputTargetValue={body}
      label={i18n.BODY_FIELD_LABEL}
      ariaLabel={i18n.BODY_FIELD_ARIA_LABEL}
      errors={errors.body as string[]}
      onDocumentsChange={(json: string) => {
        editAction('body', json, index);
      }}
      onBlur={() => {
        if (!body) {
          editAction('body', '', index);
        }
      }}
      dataTestSubj="actionJsonEditor"
      euiCodeEditorProps={{
        options: {
          renderValidationDecorations: body && errors?.body?.length ? 'on' : 'off',
          lineNumbers: 'on',
          fontSize: 14,
          minimap: {
            enabled: false,
          },
          scrollBeyondLastLine: false,
          folding: true,
          wordWrap: 'on',
          wrappingIndent: 'indent',
          automaticLayout: true,
        },
      }}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { TorqParamsFields as default };
