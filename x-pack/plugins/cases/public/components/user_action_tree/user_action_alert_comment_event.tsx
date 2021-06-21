/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { isEmpty } from 'lodash';
import { EuiText, EuiLoadingSpinner } from '@elastic/eui';

import * as i18n from './translations';
import { CommentType } from '../../../common';
import { LinkAnchor } from '../links';
import { RuleDetailsNavigation } from './helpers';

interface Props {
  alertId: string;
  commentType: CommentType;
  getRuleDetailsHref: RuleDetailsNavigation['href'];
  onRuleDetailsClick?: RuleDetailsNavigation['onClick'];
  ruleId?: string | null;
  ruleName?: string | null;
  alertsCount?: number;
  loadingAlertData?: boolean;
}

const AlertCommentEventComponent: React.FC<Props> = ({
  alertId,
  getRuleDetailsHref,
  loadingAlertData = false,
  onRuleDetailsClick,
  ruleId,
  ruleName,
  alertsCount,
  commentType,
}) => {
  const onLinkClick = useCallback(
    (ev) => {
      ev.preventDefault();
      if (onRuleDetailsClick) onRuleDetailsClick(ruleId, ev);
    },
    [ruleId, onRuleDetailsClick]
  );
  const detectionsRuleDetailsHref = getRuleDetailsHref(ruleId);

  return commentType !== CommentType.generatedAlert ? (
    <>
      {`${i18n.ALERT_COMMENT_LABEL_TITLE} `}
      {loadingAlertData && <EuiLoadingSpinner size="m" />}
      {!loadingAlertData && !isEmpty(ruleId) && (
        <LinkAnchor
          onClick={onLinkClick}
          href={detectionsRuleDetailsHref}
          data-test-subj={`alert-rule-link-${alertId ?? 'deleted'}`}
        >
          {ruleName ?? i18n.UNKNOWN_RULE}
        </LinkAnchor>
      )}
      {!loadingAlertData && isEmpty(ruleId) && i18n.UNKNOWN_RULE}
    </>
  ) : (
    <>
      <b>{i18n.GENERATED_ALERT_COUNT_COMMENT_LABEL_TITLE(alertsCount ?? 0)}</b>{' '}
      {i18n.GENERATED_ALERT_COMMENT_LABEL_TITLE}{' '}
      {loadingAlertData && <EuiLoadingSpinner size="m" />}
      {!loadingAlertData && ruleId !== '' && (
        <LinkAnchor
          onClick={onLinkClick}
          href={detectionsRuleDetailsHref}
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
