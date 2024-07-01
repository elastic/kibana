/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useRuleOverviewPanelContext } from '../context';
import { FlyoutFooter } from '../../../shared/components/flyout_footer';
import { RULE_OVERVIEW_FOOTER_TEST_ID, RULE_OVERVIEW_NAVIGATE_TO_RULE_TEST_ID } from './test_ids';
import { useRuleDetailsLink } from '../../shared/hooks/use_rule_details_link';

/**
 * Footer in rule preview panel
 */
export const RuleFooter = memo(() => {
  const { ruleId } = useRuleOverviewPanelContext();
  const href = useRuleDetailsLink({ ruleId });

  return href ? (
    <FlyoutFooter data-test-subj={RULE_OVERVIEW_FOOTER_TEST_ID}>
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLink
            href={href}
            target="_blank"
            data-test-subj={RULE_OVERVIEW_NAVIGATE_TO_RULE_TEST_ID}
          >
            {i18n.translate('xpack.securitySolution.flyout.preview.rule.viewDetailsLabel', {
              defaultMessage: 'Show rule details',
            })}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </FlyoutFooter>
  ) : null;
});

RuleFooter.displayName = 'RuleFooter';
