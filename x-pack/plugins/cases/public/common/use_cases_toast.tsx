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
import { Case } from '../../common';
import { useToasts } from '../common/lib/kibana';
import { useCaseViewNavigation } from '../common/navigation';
import { CASE_SUCCESS_SYNC_TEXT, CASE_SUCCESS_TOAST, VIEW_CASE } from './translations';

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

export const useCasesToast = () => {
  const { navigateToCaseView } = useCaseViewNavigation();

  const toasts = useToasts();

  return {
    showSuccessAttach: (
      theCase: Case,
      { title, content }: { title?: string; content?: string } = {}
    ) => {
      const onViewCaseClick = () => {
        navigateToCaseView({
          detailName: theCase.id,
        });
      };
      return toasts.addSuccess({
        color: 'success',
        iconType: 'check',
        title: toMountPoint(<Title>{title ? title : CASE_SUCCESS_TOAST(theCase.title)}</Title>),
        text: toMountPoint(
          <CaseToastSuccessContent
            content={content}
            syncAlerts={theCase.settings.syncAlerts}
            onViewCaseClick={onViewCaseClick}
          />
        ),
      });
    },
  };
};
export const CaseToastSuccessContent = ({
  syncAlerts,
  onViewCaseClick,
  content,
}: {
  syncAlerts: boolean;
  onViewCaseClick: () => void;
  content?: string;
}) => {
  let toastContent: string | undefined;
  if (content !== undefined) {
    toastContent = content;
  } else if (syncAlerts) {
    toastContent = CASE_SUCCESS_SYNC_TEXT;
  }

  return (
    <>
      {toastContent !== undefined ? (
        <EuiTextStyled size="s" data-test-subj="toaster-content-sync-text">
          {toastContent}
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
