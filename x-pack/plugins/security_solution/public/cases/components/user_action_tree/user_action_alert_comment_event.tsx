/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiText, EuiLoadingSpinner } from '@elastic/eui';

import { APP_ID } from '../../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';
import { getRuleDetailsUrl, useFormatUrl } from '../../../common/components/link_to';
import { SecurityPageName } from '../../../app/types';

import * as i18n from './translations';
import { CommentType } from '../../../../../case/common/api';
import { LinkAnchor } from '../../../common/components/links';

interface Props {
  alertId: string;
  commentType: CommentType;
  ruleId: string;
  ruleName: string;
  alertsCount?: number;
  loadingAlertData?: boolean;
}

const AlertCommentEventComponent: React.FC<Props> = ({
  alertId,
  loadingAlertData = false,
  ruleId,
  ruleName,
  alertsCount,
  commentType,
}) => {
  const { navigateToApp } = useKibana().services.application;
  const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.detections);

  const onLinkClick = useCallback(
    (ev: { preventDefault: () => void }) => {
      ev.preventDefault();
      navigateToApp(`${APP_ID}:${SecurityPageName.detections}`, {
        path: getRuleDetailsUrl(ruleId ?? ''),
      });
    },
    [ruleId, navigateToApp]
  );

  return commentType !== CommentType.generatedAlert ? (
    <>
      {`${i18n.ALERT_COMMENT_LABEL_TITLE} `}
      {loadingAlertData && <EuiLoadingSpinner size="m" />}
      {!loadingAlertData && ruleId !== '' && (
        <LinkAnchor
          onClick={onLinkClick}
          href={formatUrl(getRuleDetailsUrl(ruleId ?? '', urlSearch))}
          data-test-subj={`alert-rule-link-${alertId ?? 'deleted'}`}
        >
          {ruleName}
        </LinkAnchor>
      )}
      {!loadingAlertData && ruleId === '' && <EuiText>{ruleName}</EuiText>}
    </>
  ) : (
    <>
      <b>{i18n.GENERATED_ALERT_COUNT_COMMENT_LABEL_TITLE(alertsCount ?? 0)}</b>{' '}
      {i18n.GENERATED_ALERT_COMMENT_LABEL_TITLE}{' '}
      {loadingAlertData && <EuiLoadingSpinner size="m" />}
      {!loadingAlertData && ruleId !== '' && (
        <LinkAnchor
          onClick={onLinkClick}
          href={formatUrl(getRuleDetailsUrl(ruleId ?? '', urlSearch))}
          data-test-subj={`alert-rule-link-${alertId ?? 'deleted'}`}
        >
          {ruleName}
        </LinkAnchor>
      )}
      {!loadingAlertData && ruleId === '' && <EuiText>{ruleName}</EuiText>}
    </>
  );
};

export const AlertCommentEvent = memo(AlertCommentEventComponent);
