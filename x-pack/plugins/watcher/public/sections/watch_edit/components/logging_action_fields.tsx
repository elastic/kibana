/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../components/form_errors';

export const LoggingActionFields = ({
  action,
  editAction,
}: {
  action: { text?: string };
  editAction: (changedProperty: { key: string; value: string }) => void;
}) => {
  const { text } = action;
  const errors = action.validateAction();
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);
  return (
    <Fragment>
      <ErrableFormRow
        id="loggingText"
        errorKey="text"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && text !== undefined}
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.loggingAction.logTextFieldLabel',
          {
            defaultMessage: 'Log text',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="text"
          value={text || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editAction({ key: 'text', value: e.target.value });
          }}
          onBlur={() => {
            if (!text) {
              editAction({ key: 'text', value: '' });
            }
          }}
        />
      </ErrableFormRow>
    </Fragment>
  );
};
