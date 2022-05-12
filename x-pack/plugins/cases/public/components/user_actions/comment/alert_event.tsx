/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { isEmpty } from 'lodash';
import { EuiLoadingSpinner } from '@elastic/eui';

import * as i18n from '../translations';
import { LinkAnchor } from '../../links';
import { RuleDetailsNavigation } from '../types';

interface SingleAlertProps {
  actionId: string;
  ruleId?: string | null;
  ruleName?: string | null;
  getRuleDetailsHref?: RuleDetailsNavigation['href'];
  onRuleDetailsClick?: RuleDetailsNavigation['onClick'];
  loadingAlertData?: boolean;
}

interface MultipleAlertsProps extends SingleAlertProps {
  totalAlerts: number;
}

const RuleLink: React.FC<SingleAlertProps> = memo(
  ({ onRuleDetailsClick, getRuleDetailsHref, ruleId, ruleName, loadingAlertData, actionId }) => {
    const onLinkClick = useCallback(
      (ev) => {
        ev.preventDefault();
        if (onRuleDetailsClick) onRuleDetailsClick(ruleId, ev);
      },
      [ruleId, onRuleDetailsClick]
    );

    const ruleDetailsHref = getRuleDetailsHref?.(ruleId);
    const finalRuleName = ruleName ?? i18n.UNKNOWN_RULE;

    if (loadingAlertData) {
      return <EuiLoadingSpinner size="m" data-test-subj={`alert-loading-spinner-${actionId}`} />;
    }

    if (!isEmpty(ruleId) && ruleDetailsHref != null) {
      return (
        <LinkAnchor
          onClick={onLinkClick}
          href={ruleDetailsHref}
          data-test-subj={`alert-rule-link-${actionId}`}
        >
          {finalRuleName}
        </LinkAnchor>
      );
    }

    return <>{finalRuleName}</>;
  }
);

RuleLink.displayName = 'RuleLink';

const SingleAlertCommentEventComponent: React.FC<SingleAlertProps> = ({
  actionId,
  getRuleDetailsHref,
  loadingAlertData = false,
  onRuleDetailsClick,
  ruleId,
  ruleName,
}) => {
  return (
    <span data-test-subj={`single-alert-user-action-${actionId}`}>
      {`${i18n.ALERT_COMMENT_LABEL_TITLE} `}
      <RuleLink
        actionId={actionId}
        ruleId={ruleId}
        ruleName={ruleName}
        getRuleDetailsHref={getRuleDetailsHref}
        onRuleDetailsClick={onRuleDetailsClick}
        loadingAlertData={loadingAlertData}
      />
    </span>
  );
};

SingleAlertCommentEventComponent.displayName = 'SingleAlertCommentEvent';

export const SingleAlertCommentEvent = memo(SingleAlertCommentEventComponent);

const MultipleAlertsCommentEventComponent: React.FC<MultipleAlertsProps> = ({
  actionId,
  getRuleDetailsHref,
  loadingAlertData = false,
  onRuleDetailsClick,
  ruleId,
  ruleName,
  totalAlerts,
}) => {
  return (
    <span data-test-subj={`multiple-alerts-user-action-${actionId}`}>
      {`${i18n.MULTIPLE_ALERTS_COMMENT_LABEL_TITLE(totalAlerts)}`}{' '}
      <RuleLink
        actionId={actionId}
        ruleId={ruleId}
        ruleName={ruleName}
        getRuleDetailsHref={getRuleDetailsHref}
        onRuleDetailsClick={onRuleDetailsClick}
        loadingAlertData={loadingAlertData}
      />
    </span>
  );
};

MultipleAlertsCommentEventComponent.displayName = 'MultipleAlertsCommentEvent';
export const MultipleAlertsCommentEvent = memo(MultipleAlertsCommentEventComponent);
