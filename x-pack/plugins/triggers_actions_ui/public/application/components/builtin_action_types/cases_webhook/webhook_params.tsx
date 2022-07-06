/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { ActionParamsProps } from '../../../../types';
import { CasesWebhookActionConnector, CasesWebhookActionParams } from './types';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';

const WebhookParamsFields: React.FunctionComponent<ActionParamsProps<CasesWebhookActionParams>> = ({
  actionConnector,
  actionParams,
  editAction,
  errors,
  index,
  messageVariables,
}) => {
  const { incident, comments } = useMemo(
    () =>
      actionParams.subActionParams ??
      ({
        incident: {},
        comments: [],
      } as unknown as CasesWebhookActionParams['subActionParams']),
    [actionParams.subActionParams]
  );

  const { createCommentUrl, createCommentJson } = (
    actionConnector as unknown as CasesWebhookActionConnector
  ).config;

  const labelOptions = useMemo(
    () => (incident.labels ? incident.labels.map((label: string) => ({ label })) : []),
    [incident.labels]
  );
  const editSubActionProperty = useCallback(
    (key: string, value: any) => {
      return editAction(
        'subActionParams',
        {
          incident: { ...incident, [key]: value },
          comments,
        },
        index
      );
    },
    [comments, editAction, incident, index]
  );
  const editComment = useCallback(
    (key, value) => {
      return editAction(
        'subActionParams',
        {
          incident,
          comments: [{ commentId: '1', comment: value }],
        },
        index
      );
    },
    [editAction, incident, index]
  );
  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', 'pushToService', index);
    }
    if (!actionParams.subActionParams) {
      editAction(
        'subActionParams',
        {
          incident: {},
          comments: [],
        },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams]);

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
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhook.tagsFieldLabel',
          {
            defaultMessage: 'Tags',
          }
        )}
        error={errors['subActionParams.incident.labels'] as string[]}
      >
        <EuiComboBox
          noSuggestions
          fullWidth
          selectedOptions={labelOptions}
          onCreateOption={(searchValue: string) => {
            const newOptions = [...labelOptions, { label: searchValue }];
            editSubActionProperty(
              'labels',
              newOptions.map((newOption) => newOption.label)
            );
          }}
          onChange={(selectedOptions: Array<{ label: string }>) => {
            editSubActionProperty(
              'labels',
              selectedOptions.map((selectedOption) => selectedOption.label)
            );
          }}
          onBlur={() => {
            if (!incident.labels) {
              editSubActionProperty('labels', []);
            }
          }}
          isClearable={true}
          data-test-subj="tagsComboBox"
        />
      </EuiFormRow>
      <TextAreaWithMessageVariables
        index={index}
        isDisabled={!createCommentUrl || !createCommentJson}
        editAction={editComment}
        messageVariables={messageVariables}
        paramsProperty={'comments'}
        inputTargetValue={comments && comments.length > 0 ? comments[0].comment : undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhook.commentsTextAreaFieldLabel',
          {
            defaultMessage: 'Additional comments',
          }
        )}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { WebhookParamsFields as default };
