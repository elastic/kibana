/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { CommentType, SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { useGetUserCasesPermissions } from './useGetCasesPermissions';
import { useKibana } from '../common/lib/kibana';

interface IProps {
  actionId: string;
  agentIds?: string[];
}

export const AddToCaseButton: React.FC<IProps> = ({ actionId, agentIds }) => {
  const onClose = () => null;
  const onSuccess = () => null;
  const { cases: casesUi } = useKibana().services;

  const casePermissions = useGetUserCasesPermissions();
  const hasWritePermissions = casePermissions.crud;

  const createCaseFlyout = casesUi.hooks.getUseCasesAddToNewCaseFlyout({
    onClose,
    onSuccess,
  });
  const selectCaseModal = casesUi.hooks.getUseCasesAddToExistingCaseModal({
    onClose,
    onRowClick: onSuccess,
  });

  const handleClick = useCallback(() => {
    const attachments = [
      {
        type: CommentType.externalReference as const,
        externalReferenceId: 'my-id',
        externalReferenceStorage: {
          type: 'elasticSearchDoc',
        },
        externalReferenceAttachmentTypeId: 'osquery',
        externalReferenceMetadata: { actionId, agentIds },
        owner: SECURITY_SOLUTION_OWNER,
      },
    ];

    if (!hasWritePermissions) {
      createCaseFlyout.open({ attachments });
    } else {
      selectCaseModal.open({ attachments });
    }
  }, [actionId, agentIds, createCaseFlyout, hasWritePermissions, selectCaseModal]);

  return <button onClick={handleClick}>ADD TO CASE</button>;
};
