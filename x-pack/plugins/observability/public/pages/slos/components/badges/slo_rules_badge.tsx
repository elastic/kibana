/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';

import { SloRule } from '../../../../hooks/slo/use_fetch_rules_for_slo';

export interface Props {
  rules: Array<Rule<SloRule>> | undefined;
  onClick?: () => void;
}

export function SloRulesBadge({ rules, onClick }: Props) {
  return rules === undefined || rules.length > 0 ? null : (
    <EuiToolTip
      position="top"
      content={i18n.translate('xpack.observability.slo.slo.rulesBadge.popover', {
        defaultMessage:
          'There are no rules configured for this SLO yet. You will not receive alerts when SLO is breached.',
      })}
      display="block"
    >
      <span onClick={onClick} onKeyDown={onClick}>
        <EuiBadge color="text" iconType="alert" css={{ cursor: 'pointer' }} />
      </span>
    </EuiToolTip>
  );
}
