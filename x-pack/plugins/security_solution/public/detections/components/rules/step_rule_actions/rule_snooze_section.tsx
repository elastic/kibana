/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import type { RuleObjectId } from '../../../../../common/detection_engine/rule_schema';
import { RuleSnoozeBadge } from '../../../../detection_engine/rule_management/components/rule_snooze_badge';
import * as i18n from './translations';

interface RuleSnoozeSectionProps {
  ruleId: RuleObjectId; // Rule SO's id (not ruleId)
}

export function RuleSnoozeSection({ ruleId }: RuleSnoozeSectionProps): JSX.Element {
  const { euiTheme } = useEuiTheme();

  return (
    <section>
      <EuiText size="s">{i18n.RULE_SNOOZE_DESCRIPTION}</EuiText>
      <EuiFlexGroup
        alignItems="center"
        css={css`
          margin-top: ${euiTheme.size.s};
        `}
      >
        <EuiFlexItem grow={false}>
          <RuleSnoozeBadge ruleId={ruleId} showTooltipInline />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{i18n.SNOOZED_ACTIONS_WARNING}</strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </section>
  );
}
