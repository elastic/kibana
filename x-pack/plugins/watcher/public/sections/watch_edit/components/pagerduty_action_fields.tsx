/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../components/form_errors';

interface Props {
  action: { text?: string };
  editAction: (changedProperty: { key: string; value: string }) => void;
}

export const PagerDutyActionFields: React.FunctionComponent<Props> = ({ action, editAction }) => {
  const { message } = action;
  const errors = action.validateAction();
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);
  return (
    <Fragment>
      <ErrableFormRow
        id="pagerDutyMessage"
        errorKey="message"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && message !== undefined}
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.pagerDutyAction.descriptionFieldLabel',
          {
            defaultMessage: 'Description',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="message"
          value={message || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editAction({ key: 'message', value: e.target.value });
          }}
          onBlur={() => {
            if (!message) {
              editAction({ key: 'message', value: '' });
            }
          }}
        />
      </ErrableFormRow>
    </Fragment>
  );
};
