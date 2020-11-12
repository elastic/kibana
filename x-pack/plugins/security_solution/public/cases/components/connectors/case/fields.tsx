/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @kbn/eslint/no-restricted-paths */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { EuiCallOut } from '@elastic/eui';

import {
  ActionParamsProps,
  ActionVariable,
} from '../../../../../../triggers_actions_ui/public/types';
import { TextAreaWithMessageVariables } from '../../../../../../triggers_actions_ui/public/common';

import { CaseActionParams } from './types';
import { ExistingCase } from './existing_case';

import * as i18n from './translations';

const isSome = (messageVariables: ActionVariable[] | undefined, variableName: string) =>
  !!messageVariables?.find((variable) => variable.name === variableName);

const Container = styled.div`
  ${({ theme }) => `
    margin-top: ${theme.eui.euiSize};
  `}
`;

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
  const isAlert = useMemo(() => isSome(messageVariables, 'alertId'), [messageVariables]);
  const isDetectionAlert = useMemo(() => isSome(messageVariables, 'context.rule.id'), [
    messageVariables,
  ]);

  const {
    caseId = null,
    comment = {
      comment: '',
      context: {
        type: isAlert || isDetectionAlert ? 'alert' : 'user',
        savedObjectId: isDetectionAlert ? '{{context.rule.id}}' : isAlert ? '{{alertId}}' : null,
      },
    },
  } = actionParams.subActionParams ?? {};

  const [selectedCase, setSelectedCase] = useState<string | null>(null);

  const editSubActionProperty = useCallback(
    (key: string, value: unknown) => {
      const newProps = { ...actionParams.subActionParams, [key]: value };
      editAction('subActionParams', newProps, index);
    },
    [actionParams.subActionParams, editAction, index]
  );

  const onEditComment = useCallback(
    (key, value) => editSubActionProperty(key, { ...comment, comment: value }),
    [editSubActionProperty, comment]
  );

  const onCaseChanged = useCallback(
    (id: string) => {
      setSelectedCase(id);
      editSubActionProperty('caseId', id);
    },
    [editSubActionProperty]
  );

  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', 'addComment', index);
    }

    if (!actionParams.subActionParams?.caseId) {
      editSubActionProperty('caseId', caseId);
    }

    if (!actionParams.subActionParams?.comment) {
      editSubActionProperty('comment', comment);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionConnector, actionParams.subAction, index]);

  return (
    <>
      <EuiCallOut size="s" title={i18n.CASE_CONNECTOR_CALL_OUT_INFO} iconType="iInCircle" />
      <Container>
        <ExistingCase onCaseChanged={onCaseChanged} selectedCase={selectedCase} />
      </Container>
      <Container>
        <TextAreaWithMessageVariables
          index={index}
          editAction={onEditComment}
          messageVariables={messageVariables}
          paramsProperty={'comment'}
          inputTargetValue={comment && comment.comment?.length > 0 ? comment.comment : ''}
          label={i18n.CASE_CONNECTOR_COMMENT_LABEL}
          errors={errors.comment as string[]}
        />
      </Container>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { CaseParamsFields as default };
