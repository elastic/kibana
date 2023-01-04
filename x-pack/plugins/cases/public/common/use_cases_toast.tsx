/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorToastOptions } from '@kbn/core/public';
import { EuiButtonEmpty, EuiText } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { isValidOwner } from '../../common/utils/owner';
import type { Case } from '../../common';
import { CommentType } from '../../common';
import { useKibana, useToasts } from './lib/kibana';
import { generateCaseViewPath } from './navigation';
import type { CaseAttachmentsWithoutOwner, ServerError } from '../types';
import {
  CASE_ALERT_SUCCESS_SYNC_TEXT,
  CASE_ALERT_SUCCESS_TOAST,
  CASE_SUCCESS_TOAST,
  VIEW_CASE,
} from './translations';
import { OWNER_INFO } from '../../common/constants';
import { useCasesContext } from '../components/cases_context/use_cases_context';

const LINE_CLAMP = 3;
const Title = styled.span`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: ${LINE_CLAMP};
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`;
const EuiTextStyled = styled(EuiText)`
  ${({ theme }) => `
    margin-bottom: ${theme.eui?.paddingSizes?.s ?? 8}px;
  `}
`;

function getAlertsCount(attachments: CaseAttachmentsWithoutOwner): number {
  let alertsCount = 0;
  for (const attachment of attachments) {
    if (attachment.type === CommentType.alert) {
      // alertId might be an array
      if (Array.isArray(attachment.alertId) && attachment.alertId.length > 1) {
        alertsCount += attachment.alertId.length;
      } else {
        // or might be a single string
        alertsCount++;
      }
    }
  }
  return alertsCount;
}

function getToastTitle({
  theCase,
  title,
  attachments,
}: {
  theCase: Case;
  title?: string;
  attachments?: CaseAttachmentsWithoutOwner;
}): string {
  if (title !== undefined) {
    return title;
  }
  if (attachments !== undefined) {
    const alertsCount = getAlertsCount(attachments);
    if (alertsCount > 0) {
      return CASE_ALERT_SUCCESS_TOAST(theCase.title, alertsCount);
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
  attachments?: CaseAttachmentsWithoutOwner;
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

const isServerError = (error: Error | ServerError): error is ServerError =>
  Object.hasOwn(error, 'body');

const getError = (error: Error | ServerError): Error => {
  if (isServerError(error)) {
    return new Error(error.body?.message);
  }

  return error;
};

const getErrorMessage = (error: Error | ServerError): string => {
  if (isServerError(error)) {
    return error.body?.message ?? '';
  }

  return error.message;
};

export const useCasesToast = () => {
  const { appId } = useCasesContext();
  const { getUrlForApp, navigateToUrl } = useKibana().services.application;

  const toasts = useToasts();

  return {
    showSuccessAttach: ({
      theCase,
      attachments,
      title,
      content,
    }: {
      theCase: Case;
      attachments?: CaseAttachmentsWithoutOwner;
      title?: string;
      content?: string;
    }) => {
      const appIdToNavigateTo = isValidOwner(theCase.owner)
        ? OWNER_INFO[theCase.owner].appId
        : appId;

      const url = getUrlForApp(appIdToNavigateTo, {
        deepLinkId: 'cases',
        path: generateCaseViewPath({ detailName: theCase.id }),
      });

      const onViewCaseClick = () => {
        navigateToUrl(url);
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
    showErrorToast: (error: Error | ServerError, opts?: ErrorToastOptions) => {
      if (error.name !== 'AbortError') {
        toasts.addError(getError(error), { title: getErrorMessage(error), ...opts });
      }
    },
    showSuccessToast: (title: string) => {
      toasts.addSuccess(title);
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
