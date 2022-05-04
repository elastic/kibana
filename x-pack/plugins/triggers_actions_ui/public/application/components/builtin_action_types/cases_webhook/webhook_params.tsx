/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow } from '@elastic/eui';
import { ActionParamsProps } from '../../../../types';
import { CasesWebhookActionParams } from '../types';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';

const WebhookParamsFields: React.FunctionComponent<ActionParamsProps<CasesWebhookActionParams>> = ({
  actionParams,
  editAction,
  index,
  messageVariables,
  errors,
}) => {
  const { summary, description } = actionParams;
  const incident = useMemo(
    () => ({
      summary,
      description,
    }),
    [summary, description]
  );
  const editSubActionProperty = useCallback(
    (key: string, value: any) => {
      if (key === 'summary') {
        editAction('summary', value, index);
      }
      if (key === 'description') {
        editAction('description', value, index);
      }
      // console.log('edit action', { ...incident, [key]: value }, index);
      // return editAction('subActionParams', { ...incident, [key]: value }, index);
    },
    [editAction, index]
  );
  return (
    <>
      <EuiFormRow
        data-test-subj="summary-row"
        fullWidth
        error={errors['subActionParams.incident.summary']}
        isInvalid={
          errors['subActionParams.incident.summary'] !== undefined &&
          errors['subActionParams.incident.summary'].length > 0 &&
          incident.summary !== undefined
        }
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhook.summaryFieldLabel',
          {
            defaultMessage: 'Summary (required)',
          }
        )}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'summary'}
          inputTargetValue={incident.summary ?? undefined}
          errors={errors['subActionParams.incident.summary'] as string[]}
        />
      </EuiFormRow>
      <TextAreaWithMessageVariables
        index={index}
        editAction={editSubActionProperty}
        messageVariables={messageVariables}
        paramsProperty={'description'}
        inputTargetValue={incident.description ?? undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhook.descriptionTextAreaFieldLabel',
          {
            defaultMessage: 'Description',
          }
        )}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { WebhookParamsFields as default };
