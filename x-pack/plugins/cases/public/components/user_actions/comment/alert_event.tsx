/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { isEmpty } from 'lodash';
import { EuiLoadingSpinner } from '@elastic/eui';

import { CommentType } from '../../../../common/api';
import * as i18n from '../translations';
import { LinkAnchor } from '../../links';
import { RuleDetailsNavigation } from '../types';

interface Props {
  alertId: string;
  commentType: CommentType;
  getRuleDetailsHref?: RuleDetailsNavigation['href'];
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
  const detectionsRuleDetailsHref = getRuleDetailsHref?.(ruleId);
  const finalRuleName = ruleName ?? i18n.UNKNOWN_RULE;

  return (
    <>
      {`${i18n.ALERT_COMMENT_LABEL_TITLE} `}
      {loadingAlertData && <EuiLoadingSpinner size="m" />}
      {!loadingAlertData && !isEmpty(ruleId) && detectionsRuleDetailsHref != null && (
        <LinkAnchor
          onClick={onLinkClick}
          href={detectionsRuleDetailsHref}
          data-test-subj={`alert-rule-link-${alertId ?? 'deleted'}`}
        >
          {finalRuleName}
        </LinkAnchor>
      )}
      {!loadingAlertData && !isEmpty(ruleId) && detectionsRuleDetailsHref == null && finalRuleName}
      {!loadingAlertData && isEmpty(ruleId) && finalRuleName}
    </>
  );
};
AlertCommentEventComponent.displayName = 'AlertCommentEvent';

export const AlertCommentEvent = memo(AlertCommentEventComponent);
