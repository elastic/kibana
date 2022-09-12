/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { CommentType, ExternalReferenceStorageType } from '@kbn/cases-plugin/common';
import { EuiButtonEmpty, EuiButtonIcon, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { JsonValue } from '@kbn/utility-types';
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
  actionId: string;
  isIcon?: boolean;
  isDisabled?: boolean;
}

// interface OsqueryCasesButtonComponentProps {
//   onClick: () => void;
// }
//
// const OsqueryCasesButtonComponent: React.FC<OsqueryCasesButtonComponentProps> = (props) => (
//   <EuiButtonIcon iconType={'casesApp'} color="text" size="xs" iconSize="l" {...props} />
// );

export const AddToCaseButton: React.FC<IProps> = ({
  actionId,
  agentIds,
  queryId,
  isIcon = false,
  isDisabled,
}) => {
  const { cases: casesUi } = useKibana().services;

  const casePermissions = useGetUserCasesPermissions();
  const hasWritePermissions = casePermissions.all;

  const createCaseFlyout = casesUi.hooks.getUseCasesAddToNewCaseFlyout({});
  const selectCaseModal = casesUi.hooks.getUseCasesAddToExistingCaseModal({});

  const handleClick = useCallback(() => {
    const attachments = [
      // TODO could somebody please advise how to type this properly? Thank you!
      {
        type: CommentType.externalReference as const,
        externalReferenceId: actionId,
        externalReferenceStorage: {
          type: ExternalReferenceStorageType.elasticSearchDoc as const,
        },
        externalReferenceAttachmentTypeId: 'osquery',
        externalReferenceMetadata: { actionId, agentIds, queryId } as { [x: string]: JsonValue },
      },
    ];
    if (!hasWritePermissions) {
      createCaseFlyout.open({ attachments });
    } else {
      selectCaseModal.open({ attachments });
    }
  }, [actionId, agentIds, createCaseFlyout, hasWritePermissions, queryId, selectCaseModal]);

  if (isIcon) {
    return (
      <EuiToolTip content={<EuiFlexItem>Add to Case</EuiFlexItem>}>
        <EuiButtonIcon iconType={'casesApp'} onClick={handleClick} isDisabled={isDisabled} />
      </EuiToolTip>
    );
  }

  return (
    <EuiButtonEmpty size="xs" iconType="casesApp" onClick={handleClick} isDisabled={isDisabled}>
      {ADD_TO_CASE}
    </EuiButtonEmpty>
  );
};
