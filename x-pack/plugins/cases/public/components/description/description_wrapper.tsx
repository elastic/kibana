/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { EuiCommentList, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import React, { useMemo } from 'react';
import styled from 'styled-components';

import type { Case } from '../../containers/types';
import type { OnUpdateFields } from '../case_view/types';
import { getDescriptionUserAction } from '../user_actions/description';
import { useUserActionsHandler } from '../user_actions/use_user_actions_handler';
import { useCasesContext } from '../cases_context/use_cases_context';

interface DescriptionWrapperProps {
  data: Case;
  isLoadingDescription: boolean;
  userProfiles: Map<string, UserProfileWithAvatar>;
  onUpdateField: ({ key, value, onSuccess, onError }: OnUpdateFields) => void;
}

const MyEuiCommentList = styled(EuiCommentList)`
  & .euiComment > [class*='euiTimelineItemIcon-top'] {
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
`;

export const DescriptionWrapper = React.memo(
  ({
    data: caseData,
    isLoadingDescription,
    userProfiles,
    onUpdateField,
  }: DescriptionWrapperProps) => {
    const { appId } = useCasesContext();

    const { commentRefs, manageMarkdownEditIds, handleManageMarkdownEditId } =
      useUserActionsHandler();

    const descriptionCommentListObj: EuiCommentProps = useMemo(
      () =>
        getDescriptionUserAction({
          appId,
          caseData,
          commentRefs,
          userProfiles,
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
        userProfiles,
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

DescriptionWrapper.displayName = 'DescriptionWrapper';
