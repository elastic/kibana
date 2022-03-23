/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiText } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';
import { Case, CommentType } from '../../common';
import { useToasts } from '../common/lib/kibana';
import { useCaseViewNavigation } from '../common/navigation';
import { CaseAttachments } from '../types';
import {
  CASE_ALERT_SUCCESS_SYNC_TEXT,
  CASE_ALERT_SUCCESS_TOAST,
  CASE_SUCCESS_TOAST,
  VIEW_CASE,
} from './translations';

const LINE_CLAMP = 3;
const Title = styled.span`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: ${LINE_CLAMP};
  -webkit-box-orient: vertical;
  overflow: hidden;
`;
const EuiTextStyled = styled(EuiText)`
  ${({ theme }) => `
    margin-bottom: ${theme.eui?.paddingSizes?.s ?? 8}px;
  `}
`;

function getToastTitle({
  theCase,
  title,
  attachments,
}: {
  theCase: Case;
  title?: string;
  attachments?: CaseAttachments;
}): string {
  if (title !== undefined) {
    return title;
  }
  if (attachments !== undefined) {
    for (const attachment of attachments) {
      if (attachment.type === CommentType.alert) {
        return CASE_ALERT_SUCCESS_TOAST(theCase.title);
      }
    }
  }
  return CASE_SUCCESS_TOAST(theCase.title);
}

function getToastContent({
  theCase,
  content,
  attachments,
}: {
  theCase: Case;
  content?: string;
  attachments?: CaseAttachments;
}): string | undefined {
  if (content !== undefined) {
    return content;
  }
  if (attachments !== undefined) {
    for (const attachment of attachments) {
      if (attachment.type === CommentType.alert && theCase.settings.syncAlerts) {
        return CASE_ALERT_SUCCESS_SYNC_TEXT;
      }
    }
  }
  return undefined;
}

export const useCasesToast = () => {
  const { navigateToCaseView } = useCaseViewNavigation();

  const toasts = useToasts();

  return {
    showSuccessAttach: ({
      theCase,
      attachments,
      title,
      content,
    }: {
      theCase: Case;
      attachments?: CaseAttachments;
      title?: string;
      content?: string;
    }) => {
      const onViewCaseClick = () => {
        navigateToCaseView({
          detailName: theCase.id,
        });
      };
      const renderTitle = getToastTitle({ theCase, title, attachments });
      const renderContent = getToastContent({ theCase, content, attachments });

      return toasts.addSuccess({
        color: 'success',
        iconType: 'check',
        title: toMountPoint(<Title>{renderTitle}</Title>),
        text: toMountPoint(
          <CaseToastSuccessContent content={renderContent} onViewCaseClick={onViewCaseClick} />
        ),
      });
    },
  };
};

export const CaseToastSuccessContent = ({
  onViewCaseClick,
  content,
}: {
  onViewCaseClick: () => void;
  content?: string;
}) => {
  return (
    <>
      {content !== undefined ? (
        <EuiTextStyled size="s" data-test-subj="toaster-content-sync-text">
          {content}
        </EuiTextStyled>
      ) : null}
      <EuiButtonEmpty
        size="xs"
        flush="left"
        onClick={onViewCaseClick}
        data-test-subj="toaster-content-case-view-link"
      >
        {VIEW_CASE}
      </EuiButtonEmpty>
    </>
  );
};
CaseToastSuccessContent.displayName = 'CaseToastSuccessContent';
