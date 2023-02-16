/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps } from '@elastic/eui';
import { EuiCommentList, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import React, { useMemo } from 'react';
import styled from 'styled-components';

import type { Case } from '../../containers/types';
import type { OnUpdateFields } from '../case_view/types';
import { getDescriptionUserAction } from './description';
import { useUserActionsHandler } from './use_user_actions_handler';
import { useCasesContext } from '../cases_context/use_cases_context';

interface DescriptionHandler {
  data: Case;
  isLoadingDescription: boolean;
  onUpdateField: ({ key, value, onSuccess, onError }: OnUpdateFields) => void;
}

const MyEuiCommentList = styled(EuiCommentList)`
  ${({ theme }) => `
    & .euiComment > [class*="euiTimelineItemIcon-top"] {
      display: none;
    }

    & .draftFooter {
      & .euiCommentEvent__body {
        padding: 0;
      }
    }

    & .euiComment.isEdit {
      & .euiCommentEvent {
        border: none;
        box-shadow: none;
      }

      & .euiCommentEvent__body {
        padding: 0;
      }

      & .euiCommentEvent__header {
        display: none;
      }
    }

    & .comment-alert .euiCommentEvent {
      background-color: ${theme.eui.euiColorLightestShade};
      border: ${theme.eui.euiBorderThin};
      padding: ${theme.eui.euiSizeS};
      border-radius: ${theme.eui.euiSizeXS};
    }

    & .comment-alert .euiCommentEvent__headerData {
      flex-grow: 1;
    }

    & .comment-action.empty-comment [class*="euiCommentEvent-regular"] {
      box-shadow: none;
      .euiCommentEvent__header {
        padding: ${theme.eui.euiSizeM} ${theme.eui.euiSizeS};
        border-bottom: 0;
      }
    }
  `}
`;

export const UseDescriptionHandler = React.memo(
  ({ data: caseData, isLoadingDescription, onUpdateField }: DescriptionHandler) => {
    const { appId } = useCasesContext();

    const { commentRefs, manageMarkdownEditIds, handleManageMarkdownEditId } =
      useUserActionsHandler();

    const descriptionCommentListObj: EuiCommentProps = useMemo(
      () =>
        getDescriptionUserAction({
          appId,
          caseData,
          commentRefs,
          manageMarkdownEditIds,
          isLoadingDescription,
          onUpdateField,
          handleManageMarkdownEditId,
        }),
      [
        appId,
        caseData,
        commentRefs,
        manageMarkdownEditIds,
        isLoadingDescription,
        onUpdateField,
        handleManageMarkdownEditId,
      ]
    );

    return isLoadingDescription ? (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner data-test-subj="description-loading" size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      <MyEuiCommentList
        comments={[descriptionCommentListObj]}
        data-test-subj="description-wrapper"
      />
    );
  }
);

UseDescriptionHandler.displayName = 'UseDescriptionHandler';
