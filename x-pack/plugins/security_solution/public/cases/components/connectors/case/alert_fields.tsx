/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @kbn/eslint/no-restricted-paths */

import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { EuiCallOut } from '@elastic/eui';

import { ActionParamsProps } from '../../../../../../triggers_actions_ui/public/types';
import { CommentType } from '../../../../../../case/common/api';

import { CaseActionParams } from './types';
import { ExistingCase } from './existing_case';

import * as i18n from './translations';

const Container = styled.div`
  ${({ theme }) => `
    margin-top: ${theme.eui?.euiSize ?? '16px'};
  `}
`;

const defaultAlertComment = {
  type: CommentType.generatedAlert,
  alerts: `[{{#context.alerts}}{"_id": "{{_id}}", "_index": "{{_index}}", "ruleId": "{{rule.id}}", "ruleName": "{{rule.name}}"}__SEPARATOR__{{/context.alerts}}]`,
};

const CaseParamsFields: React.FunctionComponent<ActionParamsProps<CaseActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  actionConnector,
}) => {
  const { caseId = null, comment = defaultAlertComment } = actionParams.subActionParams ?? {};

  const [selectedCase, setSelectedCase] = useState<string | null>(null);

  const editSubActionProperty = useCallback(
    (key: string, value: unknown) => {
      const newProps = { ...actionParams.subActionParams, [key]: value };
      editAction('subActionParams', newProps, index);
    },
    [actionParams.subActionParams, editAction, index]
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

    if (caseId != null) {
      setSelectedCase((prevCaseId) => (prevCaseId !== caseId ? caseId : prevCaseId));
    }

    // editAction creates an infinity loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    actionConnector,
    index,
    actionParams.subActionParams?.caseId,
    actionParams.subActionParams?.comment,
    caseId,
    comment,
    actionParams.subAction,
  ]);

  return (
    <>
      <EuiCallOut size="s" title={i18n.CASE_CONNECTOR_CALL_OUT_INFO} iconType="iInCircle" />
      <Container>
        <ExistingCase onCaseChanged={onCaseChanged} selectedCase={selectedCase} />
      </Container>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { CaseParamsFields as default };
