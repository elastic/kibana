/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { JsonEditorWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFormRow } from '@elastic/eui';
import { EuiFieldText } from '@elastic/eui';
import { D3ActionParams } from '../types';

const D3ParamsFields: React.FunctionComponent<ActionParamsProps<D3ActionParams>> = ({
  actionParams,
  editAction,
  index,
  messageVariables,
  errors,
}) => {
  const { body, severity, eventType } = actionParams;
  return (
    <>
      <EuiFormRow
        fullWidth
        error={errors.eventType}
        isInvalid={false}
        label={i18n.translate('xpack.stackConnectors.components.d3security.eventTypeFieldLabel', {
          defaultMessage: 'Event Type',
        })}
      >
        <EuiFieldText
          data-test-subj="eventTypeInput"
          name="eventType"
          value={eventType}
          onChange={(e) => editAction('eventType', e.target.value, index)}
          isInvalid={false}
          fullWidth={true}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        error={errors.severity}
        isInvalid={false}
        label={i18n.translate('xpack.stackConnectors.components.d3security.severityFieldLabel', {
          defaultMessage: 'Severity',
        })}
      >
        <EuiFieldText
          data-test-subj="severityInput"
          name="severity"
          value={severity}
          onChange={(e) => editAction('severity', e.target.value, index)}
          isInvalid={false}
          fullWidth={true}
        />
      </EuiFormRow>

      <JsonEditorWithMessageVariables
        messageVariables={messageVariables}
        paramsProperty={'body'}
        inputTargetValue={body}
        label={i18n.translate('xpack.stackConnectors.components.d3security.bodyFieldLabel', {
          defaultMessage: 'Body',
        })}
        aria-label={i18n.translate(
          'xpack.stackConnectors.components.d3security.bodyCodeEditorAriaLabel',
          {
            defaultMessage: 'Code editor',
          }
        )}
        errors={errors.body as string[]}
        onDocumentsChange={(json: string) => {
          editAction('body', json, index);
        }}
        onBlur={() => {
          if (!body) {
            editAction('body', '', index);
          }
        }}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { D3ParamsFields as default };
