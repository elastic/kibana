/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @kbn/eslint/no-restricted-paths */

import React, { useCallback } from 'react';

import { ActionParamsProps } from '../../../../../../triggers_actions_ui/public/types';
import { TextAreaWithMessageVariables } from '../../../../../../triggers_actions_ui/public/common';
import { CaseActionParams } from './types';
import * as i18n from './translations';

const CaseParamsFields: React.FunctionComponent<ActionParamsProps<CaseActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  actionConnector,
  http,
  toastNotifications,
}) => {
  const { comment = { comment: '', type: 'alert' } } = actionParams.subActionParams ?? {};

  const editSubActionProperty = useCallback(
    (key: string, value: unknown) => {
      const newProps = { ...actionParams.subActionParams, [key]: value };
      editAction('subActionParams', newProps, index);
    },
    [actionParams.subActionParams, editAction, index]
  );

  const onEditComment = useCallback(
    (key, value) => editSubActionProperty(key, { type: 'alert', comment: value }),
    [editSubActionProperty]
  );

  return (
    <>
      <TextAreaWithMessageVariables
        index={index}
        editAction={onEditComment}
        messageVariables={messageVariables}
        paramsProperty={'comment'}
        inputTargetValue={comment && comment.comment?.length > 0 ? comment.comment : ''}
        label={i18n.CASE_CONNECTOR_COMMENT_LABEL}
        errors={errors.comment as string[]}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { CaseParamsFields as default };
