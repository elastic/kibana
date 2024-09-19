/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @kbn/eslint/no-restricted-paths */

import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import { ActionParamsProps } from '../../../../../triggers_actions_ui/public/types';
import { CommentType, SECURITY_SOLUTION_OWNER } from '../../../../common';

import { CaseActionParams } from './types';
import { ExistingCase } from './existing_case';

import * as i18n from './translations';
import { OwnerProvider } from '../../owner_context';

const Container = styled.div`
  ${({ theme }) => `
    padding:  ${theme.eui?.euiSizeS ?? '8px'} ${theme.eui?.euiSizeL ?? '24px'} ${
    theme.eui?.euiSizeL ?? '24px'
  } ${theme.eui?.euiSizeL ?? '24px'};
  `}
`;

const defaultAlertComment = {
  type: CommentType.generatedAlert,
  alerts: `[{{#context.alerts}}{"_id": "{{_id}}", "_index": "{{_index}}", "ruleId": "{{signal.rule.id}}", "ruleName": "{{signal.rule.name}}"}__SEPARATOR__{{/context.alerts}}]`,
};

const CaseParamsFields: React.FunctionComponent<ActionParamsProps<CaseActionParams>> = ({
  actionParams,
  editAction,
  index,
  actionConnector,
}) => {
  const { caseId = null, comment = defaultAlertComment } = actionParams.subActionParams ?? {};

  const [selectedCase, setSelectedCase] = useState<string | null>(null);

  const editSubActionProperty = useCallback(
    (key: string, value: unknown) => {
      const newProps = { ...actionParams.subActionParams, [key]: value };
      editAction('subActionParams', newProps, index);
    },
    // edit action causes re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actionParams.subActionParams, index]
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

  /**
   * TODO: When the case connector is enabled we need to figure out
   * how we can pass the owner to this component
   */
  return (
    <Container>
      <OwnerProvider owner={[SECURITY_SOLUTION_OWNER]}>
        <ExistingCase onCaseChanged={onCaseChanged} selectedCase={selectedCase} />
      </OwnerProvider>
      <EuiSpacer size="m" />
      <EuiCallOut size="s" title={i18n.CASE_CONNECTOR_CALL_OUT_TITLE} iconType="iInCircle">
        <p>{i18n.CASE_CONNECTOR_CALL_OUT_MSG}</p>
      </EuiCallOut>
    </Container>
  );
};

// eslint-disable-next-line import/no-default-export
export { CaseParamsFields as default };
