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
import styled from 'styled-components';
import type { TimelineEventsDetailsItem } from '../../../../../../../common/search_strategy';
import { useGetUserCasesPermissions, useKibana } from '../../../../../../common/lib/kibana';
import { useGetRelatedCasesByEvent } from '../../../../../../common/containers/cases/use_get_related_cases_by_event';
import {
  ADD_TO_EXISTING_CASE_BUTTON,
  ADD_TO_NEW_CASE_BUTTON,
  CASES_PANEL_SUBTITLE,
  CASES_PANEL_TITLE,
  CASE_NO_READ_PERMISSIONS,
  ERROR_LOADING_CASES,
  LOADING_CASES,
  NO_RELATED_CASES_FOUND,
} from '../translation';
import { SummaryPanel } from '../wrappers';
import { CasesPanelActions, CASES_PANEL_ACTIONS_CLASS } from './cases_panel_actions';
import { RelatedCasesList } from './related_case';

export interface CasesPanelProps {
  eventId: string;
  dataAsNestedObject: Ecs | null;
  detailsData: TimelineEventsDetailsItem[];
}

const StyledCasesFlexGroup = styled(EuiFlexGroup)`
  max-height: 300px;
  overflow-y: auto;
`;

/**
 * There is currently no api limit for the number of cases that can be returned
 * To prevent the UI from growing too large, we limit to 25 most recent cases
 */
export const CASES_PANEL_CASES_COUNT_MAX = 25;

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

    // Sort by most recently created being first
    const relatedCasesCount = relatedCases ? relatedCases.length : 0;
    const visibleCaseCount = useMemo(
      () => Math.min(relatedCasesCount, CASES_PANEL_CASES_COUNT_MAX),
      [relatedCasesCount]
    );
    const hasRelatedCases = relatedCasesCount > 0;

    if (loading) return <CasesPanelLoading />;

    if (error || relatedCases === undefined) return <CasesPanelError />;

    return (
      <SummaryPanel
        actionsClassName={CASES_PANEL_ACTIONS_CLASS}
        title={CASES_PANEL_TITLE}
        description={hasRelatedCases ? CASES_PANEL_SUBTITLE(visibleCaseCount) : undefined}
        renderActionsPopover={hasRelatedCases ? renderCasesActions : undefined}
      >
        {hasRelatedCases ? (
          <StyledCasesFlexGroup direction="column" data-test-subj="case-panel">
            <RelatedCasesList
              maximumVisible={CASES_PANEL_CASES_COUNT_MAX}
              relatedCases={relatedCases}
            />
          </StyledCasesFlexGroup>
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
