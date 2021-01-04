/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../../../components/form_errors';
import { SwimlaneAction } from '../../../../../../../common/types/action_types';

interface Props {
  action: SwimlaneAction;
  editAction: (changedProperty: { key: string; value: string }) => void;
  errors: { [key: string]: string[] };
  hasErrors: boolean;
  children: React.ReactNode;
}

export const SwimlaneActionFields: React.FunctionComponent<Props> = ({
  errors,
  hasErrors,
  action,
  editAction,
  children,
}) => {
  const { description } = action;
  return (
    <Fragment>
      {children}
      <ErrableFormRow
        id="swimlaneDescription"
        errorKey="description"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && description !== undefined}
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.swimlaneAction.descriptionFieldLabel',
          {
            defaultMessage: 'Description',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="description"
          value={description || ''}
          data-test-subj="swimlaneDescriptionInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editAction({ key: 'description', value: e.target.value });
          }}
          onBlur={() => {
            if (!description) {
              editAction({ key: 'description', value: '' });
            }
          }}
        />
      </ErrableFormRow>
    </Fragment>
  );
};
