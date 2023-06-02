/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiComboBox, EuiFormRow, EuiSpacer } from '@elastic/eui';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import {
  TextAreaWithMessageVariables,
  TextFieldWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import { CasesWebhookActionConnector, CasesWebhookActionParams } from './types';

const CREATE_COMMENT_WARNING_TITLE = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createCommentWarningTitle',
  {
    defaultMessage: 'Unable to share case comments',
  }
);

const CREATE_COMMENT_WARNING_DESC = i18n.translate(
  'xpack.stackConnectors.components.casesWebhook.createCommentWarningDesc',
  {
    defaultMessage:
      'Configure the Create Comment URL and Create Comment Objects fields for the connector to share comments externally.',
  }
);

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
    () => (incident.tags ? incident.tags.map((label: string) => ({ label })) : []),
    [incident.tags]
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
        data-test-subj="title-row"
        fullWidth
        error={errors['subActionParams.incident.title']}
        isInvalid={
          errors['subActionParams.incident.title'] !== undefined &&
          errors['subActionParams.incident.title'].length > 0 &&
          incident.title !== undefined
        }
        label={i18n.translate('xpack.stackConnectors.components.casesWebhook.titleFieldLabel', {
          defaultMessage: 'Summary (required)',
        })}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'title'}
          inputTargetValue={incident.title ?? undefined}
          errors={errors['subActionParams.incident.title'] as string[]}
        />
      </EuiFormRow>
      <TextAreaWithMessageVariables
        index={index}
        editAction={editSubActionProperty}
        messageVariables={messageVariables}
        paramsProperty={'description'}
        inputTargetValue={incident.description ?? undefined}
        label={i18n.translate(
          'xpack.stackConnectors.components.casesWebhook.descriptionTextAreaFieldLabel',
          {
            defaultMessage: 'Description',
          }
        )}
      />
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.stackConnectors.components.casesWebhook.tagsFieldLabel', {
          defaultMessage: 'Tags',
        })}
        error={errors['subActionParams.incident.tags'] as string[]}
      >
        <EuiComboBox
          noSuggestions
          fullWidth
          selectedOptions={labelOptions}
          onCreateOption={(searchValue: string) => {
            const newOptions = [...labelOptions, { label: searchValue }];
            editSubActionProperty(
              'tags',
              newOptions.map((newOption) => newOption.label)
            );
          }}
          onChange={(selectedOptions: Array<{ label: string }>) => {
            editSubActionProperty(
              'tags',
              selectedOptions.map((selectedOption) => selectedOption.label)
            );
          }}
          onBlur={() => {
            if (!incident.tags) {
              editSubActionProperty('tags', []);
            }
          }}
          isClearable={true}
          data-test-subj="tagsComboBox"
        />
      </EuiFormRow>
      <>
        <TextAreaWithMessageVariables
          index={index}
          isDisabled={!createCommentUrl || !createCommentJson}
          editAction={editComment}
          messageVariables={messageVariables}
          paramsProperty={'comments'}
          inputTargetValue={comments && comments.length > 0 ? comments[0].comment : undefined}
          label={i18n.translate(
            'xpack.stackConnectors.components.casesWebhook.commentsTextAreaFieldLabel',
            {
              defaultMessage: 'Additional comments',
            }
          )}
        />
        {(!createCommentUrl || !createCommentJson) && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              title={CREATE_COMMENT_WARNING_TITLE}
              color="warning"
              iconType="help"
              size="s"
            >
              <p>{CREATE_COMMENT_WARNING_DESC}</p>
            </EuiCallOut>
          </>
        )}
      </>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { WebhookParamsFields as default };
