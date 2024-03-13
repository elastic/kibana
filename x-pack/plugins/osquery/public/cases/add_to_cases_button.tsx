/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo } from 'react';
import { AttachmentType, ExternalReferenceStorageType } from '@kbn/cases-plugin/common';
import { EuiButtonEmpty, EuiButtonIcon, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { getRuleIdFromEvent } from '@kbn/cases-plugin/public/client/helpers/get_rule_id_from_event';
import { useCasesAddToExistingCaseModal } from '@kbn/cases-plugin/public/components/all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import { useKibana } from '../common/lib/kibana';
import { AlertAttachmentContext } from '../common/contexts';

const ADD_TO_CASE = i18n.translate(
  'xpack.osquery.pack.queriesTable.addToCaseResultsActionAriaLabel',
  {
    defaultMessage: 'Add to Case',
  }
);

export interface AddToCaseButtonProps {
  queryId?: string;
  agentIds?: string[];
  actionId: string;
  isIcon?: boolean;
  isDisabled?: boolean;
  iconProps?: Record<string, string>;
}

export const AddToCaseButton: React.FC<AddToCaseButtonProps> = ({
  actionId,
  agentIds = [],
  queryId = '',
  isIcon = false,
  isDisabled,
  iconProps,
}) => {
  const { cases } = useKibana().services;
  const ecsData = useContext(AlertAttachmentContext);
  const alertAttachments = useMemo(
    () =>
      ecsData?._id
        ? [
            {
              alertId: ecsData?._id ?? '',
              index: ecsData?._index ?? '',
              rule: getRuleIdFromEvent({
                ecs: ecsData,
                data: [],
              }),
              type: AttachmentType.alert as const,
            },
          ]
        : [],
    [ecsData]
  );

  const casePermissions = cases.helpers.canUseCases();
  const hasCasesPermissions =
    casePermissions.read && casePermissions.update && casePermissions.push;
  const selectCaseModal = useCasesAddToExistingCaseModal();

  const handleClick = useCallback(() => {
    const attachments: CaseAttachmentsWithoutOwner = [
      ...alertAttachments,
      {
        type: AttachmentType.externalReference,
        externalReferenceId: actionId,
        externalReferenceStorage: {
          type: ExternalReferenceStorageType.elasticSearchDoc,
        },
        externalReferenceAttachmentTypeId: 'osquery',
        externalReferenceMetadata: { actionId, agentIds, queryId },
      },
    ];
    if (hasCasesPermissions) {
      selectCaseModal.open({ getAttachments: () => attachments });
    }
  }, [actionId, agentIds, alertAttachments, hasCasesPermissions, queryId, selectCaseModal]);

  if (isIcon) {
    return (
      <EuiToolTip content={<EuiFlexItem>{ADD_TO_CASE}</EuiFlexItem>}>
        <EuiButtonIcon
          iconType={'casesApp'}
          onClick={handleClick}
          isDisabled={isDisabled || !hasCasesPermissions}
          aria-label={ADD_TO_CASE}
          {...iconProps}
        />
      </EuiToolTip>
    );
  }

  return (
    <EuiButtonEmpty
      size="xs"
      iconType="casesApp"
      onClick={handleClick}
      isDisabled={isDisabled || !hasCasesPermissions}
      aria-label={ADD_TO_CASE}
    >
      {ADD_TO_CASE}
    </EuiButtonEmpty>
  );
};
