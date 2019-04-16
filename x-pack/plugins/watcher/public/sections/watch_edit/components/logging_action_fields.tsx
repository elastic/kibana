/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';

import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const LoggingActionFields = ({
  action,
  editAction,
}: {
  action: { text?: string };
  editAction: (changedProperty: { key: string; value: string }) => void;
}) => {
  const { text } = action;
  return (
    <Fragment>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.loggingAction.logTextFieldLabel',
          {
            defaultMessage: 'Log text',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          value={text}
          onChange={e => {
            editAction({ key: 'text', value: e.target.value });
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};
