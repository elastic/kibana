/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent } from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { BurnRateRuleParams } from '../../../../typings';

export interface Props {
  rules: Array<Rule<BurnRateRuleParams>> | undefined;
  onClick?: () => void;
}

export function SloRulesBadge({ rules, onClick }: Props) {
  return rules === undefined || rules.length > 0 ? null : (
    <EuiToolTip
      position="top"
      content={i18n.translate('xpack.slo.slo.rulesBadge.popover', {
        defaultMessage:
          'There are no rules configured for this SLO yet. You will not receive alerts when SLO is breached. Click to create a rule.',
      })}
      display="block"
    >
      <span onClick={onClick} onKeyDown={onClick}>
        <EuiBadge
          color="text"
          iconType="alert"
          css={{ cursor: 'pointer' }}
          onMouseDown={(e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation(); // stops propagation of metric onElementClick
          }}
        />
      </span>
    </EuiToolTip>
  );
}
