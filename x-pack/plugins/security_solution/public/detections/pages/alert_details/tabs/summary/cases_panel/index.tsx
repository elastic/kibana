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
import type { TimelineEventsDetailsItem } from '../../../../../../../common/search_strategy';
import { useGetUserCasesPermissions, useKibana } from '../../../../../../common/lib/kibana';
import { CaseDetailsLink } from '../../../../../../common/components/links';
import { useGetRelatedCasesByEvent } from '../../../../../../common/containers/cases/use_get_related_cases_by_event';
import {
  ADD_TO_EXISTING_CASE_BUTTON,
  ADD_TO_NEW_CASE_BUTTON,
  CASES_PANEL_TITLE,
  CASE_NO_READ_PERMISSIONS,
  ERROR_LOADING_CASES,
  LOADING_CASES,
  NO_RELATED_CASES_FOUND,
} from '../translation';
import { SummaryPanel } from '../wrappers';
import { CasesPanelActions, CASES_PANEL_ACTIONS_CLASS } from './cases_panel_actions';

export interface CasesPanelProps {
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

export const CasesPanel = React.memo<CasesPanelProps>(
  ({ eventId, dataAsNestedObject, detailsData }) => {
    const { cases: casesUi } = useKibana().services;
    const { loading, error, relatedCases, refetchRelatedCases } =
      useGetRelatedCasesByEvent(eventId);
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

    const addToNewCase = useCallback(() => {
      if (userCasesPermissions.create) {
        createCaseFlyout.open({ attachments: caseAttachments });
      }
    }, [userCasesPermissions.create, createCaseFlyout, caseAttachments]);

    const addToExistingCase = useCallback(() => {
      if (userCasesPermissions.update) {
        selectCaseModal.open({ attachments: caseAttachments });
      }
    }, [caseAttachments, selectCaseModal, userCasesPermissions.update]);

    const renderCasesActions = useCallback(
      () => (
        <CasesPanelActions
          addToNewCase={addToNewCase}
          addToExistingCase={addToExistingCase}
          eventId={eventId}
          dataAsNestedObject={dataAsNestedObject}
          detailsData={detailsData}
          userCasesPermissions={userCasesPermissions}
        />
      ),
      [
        addToExistingCase,
        addToNewCase,
        dataAsNestedObject,
        detailsData,
        eventId,
        userCasesPermissions,
      ]
    );

    if (loading) return <CasesPanelLoading />;

    if (error || relatedCases === undefined) return <CasesPanelError />;

    const hasRelatedCases = relatedCases && relatedCases.length > 0;

    return (
      <SummaryPanel
        actionsClassName={CASES_PANEL_ACTIONS_CLASS}
        title={CASES_PANEL_TITLE}
        renderActionsPopover={hasRelatedCases ? renderCasesActions : undefined}
      >
        {hasRelatedCases ? (
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
                    <EuiButton
                      size="s"
                      data-test-subj="add-to-existing-case-button"
                      color="primary"
                      onClick={addToExistingCase}
                    >
                      {ADD_TO_EXISTING_CASE_BUTTON}
                    </EuiButton>
                  </EuiFlexItem>
                )}
                {userCasesPermissions.create && (
                  <EuiFlexItem>
                    <EuiButton
                      size="s"
                      data-test-subj="add-to-new-case-button"
                      color="primary"
                      fill
                      onClick={addToNewCase}
                    >
                      {ADD_TO_NEW_CASE_BUTTON}
                    </EuiButton>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            }
          />
        )}
      </SummaryPanel>
    );
  }
);

CasesPanel.displayName = 'CasesPanel';
