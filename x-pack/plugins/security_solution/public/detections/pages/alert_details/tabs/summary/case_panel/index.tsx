/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';
import type { Ecs } from '@kbn/cases-plugin/common';
import { CommentType } from '@kbn/cases-plugin/common';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { useGetUserCasesPermissions, useKibana } from '../../../../../../common/lib/kibana';
import { CaseDetailsLink } from '../../../../../../common/components/links';
import { useGetRelatedCasesByEvent } from '../../../../../../common/containers/cases/use_get_related_cases_by_event';
import {
  ADD_TO_EXISTING_CASE_BUTTON,
  ADD_TO_NEW_CASE_BUTTON,
  CASE_NO_READ_PERMISSIONS,
  ERROR_LOADING_CASES,
  LOADING_CASES,
  NO_RELATED_CASES_FOUND,
} from '../translation';

interface Props {
  eventId: string;
  dataAsNestedObject: Ecs | null;
  detailsData: TimelineEventsDetailsItem[];
}

const CasesPanelLoading = () => (
  <EuiEmptyPrompt
    icon={<EuiLoadingSpinner size="l" />}
    title={<h2>{LOADING_CASES}</h2>}
    titleSize="xxs"
  />
);

const CasesPanelError = () => <>{ERROR_LOADING_CASES}</>;

export const CasesPanelNoReadPermissions = () => <EuiEmptyPrompt body={CASE_NO_READ_PERMISSIONS} />;

export const CasePanel = React.memo<Props>(({ eventId, dataAsNestedObject, detailsData }) => {
  const { loading, error, relatedCases, refetchRelatedCases } = useGetRelatedCasesByEvent(eventId);
  const { cases: casesUi } = useKibana().services;
  const userCasesPermissions = useGetUserCasesPermissions();

  const caseAttachments: CaseAttachmentsWithoutOwner = useMemo(() => {
    return dataAsNestedObject
      ? [
          {
            alertId: eventId,
            index: dataAsNestedObject._index ?? '',
            type: CommentType.alert,
            rule: casesUi.helpers.getRuleIdFromEvent({
              ecs: dataAsNestedObject,
              data: detailsData,
            }),
          },
        ]
      : [];
  }, [casesUi.helpers, dataAsNestedObject, detailsData, eventId]);

  const createCaseFlyout = casesUi.hooks.getUseCasesAddToNewCaseFlyout({
    onSuccess: refetchRelatedCases,
  });

  const selectCaseModal = casesUi.hooks.getUseCasesAddToExistingCaseModal({
    onRowClick: refetchRelatedCases,
  });

  const handleAddToNewCaseClick = useCallback(() => {
    createCaseFlyout.open({ attachments: caseAttachments });
  }, [createCaseFlyout, caseAttachments]);

  const handleAddToExistingCaseClick = useCallback(() => {
    selectCaseModal.open({ attachments: caseAttachments });
  }, [caseAttachments, selectCaseModal]);

  if (loading) return <CasesPanelLoading />;

  if (error || relatedCases === undefined) return <CasesPanelError />;

  return relatedCases.length > 0 ? (
    <EuiFlexGroup direction="column" data-test-subj="case-panel">
      {relatedCases?.map(({ id, title }) => (
        <EuiFlexItem key={id}>
          <CaseDetailsLink detailName={id} title={title}>
            {title}
          </CaseDetailsLink>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  ) : (
    <EuiEmptyPrompt
      iconColor="default"
      body={NO_RELATED_CASES_FOUND}
      actions={
        <EuiFlexGroup>
          {userCasesPermissions.update && (
            <EuiFlexItem>
              <EuiButton size="s" color="primary" onClick={handleAddToExistingCaseClick}>
                {ADD_TO_EXISTING_CASE_BUTTON}
              </EuiButton>
            </EuiFlexItem>
          )}
          {/* TODO: confirm update is the only item necessary and not also create and push */}
          {userCasesPermissions.create && (
            <EuiFlexItem>
              <EuiButton size="s" color="primary" fill onClick={handleAddToNewCaseClick}>
                {ADD_TO_NEW_CASE_BUTTON}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
    />
  );
});

CasePanel.displayName = 'CasePanel';
