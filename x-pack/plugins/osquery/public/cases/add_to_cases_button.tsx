/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { CommentType, SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { EuiButtonEmpty, EuiButtonIcon, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useGetUserCasesPermissions } from './use_get_cases_permissions';
import { useKibana } from '../common/lib/kibana';

const ADD_TO_CASE = i18n.translate(
  'xpack.osquery.pack.queriesTable.addToCaseResultsActionAriaLabel',
  {
    defaultMessage: 'Add to Case',
  }
);

interface IProps {
  queryId?: string;
  agentIds?: string[];
  actionId?: string;
}

export const AddToCaseButton: React.FC<IProps> = ({ actionId, agentIds, queryId }) => {
  const isButton = !!queryId;
  const { cases: casesUi } = useKibana().services;

  const casePermissions = useGetUserCasesPermissions();
  const hasWritePermissions = casePermissions.all;

  const createCaseFlyout = casesUi.hooks.getUseCasesAddToNewCaseFlyout({});
  const selectCaseModal = casesUi.hooks.getUseCasesAddToExistingCaseModal({});

  const handleClick = useCallback(() => {
    const attachments = [
      {
        type: CommentType.externalReference,
        externalReferenceId: actionId,
        externalReferenceStorage: {
          type: 'elasticSearchDoc',
        },
        externalReferenceAttachmentTypeId: 'osquery',
        externalReferenceMetadata: { actionId, agentIds, queryId },
        owner: SECURITY_SOLUTION_OWNER,
      },
    ];
    if (!hasWritePermissions) {
      // TODO
      // @ts-expect-error update types
      createCaseFlyout.open({ attachments });
    } else {
      // @ts-expect-error update types
      selectCaseModal.open({ attachments });
    }
  }, [actionId, agentIds, createCaseFlyout, hasWritePermissions, queryId, selectCaseModal]);

  if (!isButton) {
    return (
      <EuiToolTip content={<EuiFlexItem>Add to Case</EuiFlexItem>}>
        <EuiButtonIcon
          iconType={'casesApp'}
          color="text"
          size="xs"
          iconSize="l"
          onClick={handleClick}
        />
      </EuiToolTip>
    );
  }

  return (
    <EuiButtonEmpty size="xs" iconType="casesApp" onClick={handleClick} isDisabled={false}>
      {ADD_TO_CASE}
    </EuiButtonEmpty>
  );
};
