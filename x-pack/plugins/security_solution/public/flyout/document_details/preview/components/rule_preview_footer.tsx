/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { memo } from 'react';
import { FlyoutFooter } from '../../../shared/components/flyout_footer';
import { useRuleDetailsLink } from '../../shared/hooks/use_rule_details_link';
import { usePreviewPanelContext } from '../context';
import { RULE_PREVIEW_FOOTER_TEST_ID, RULE_PREVIEW_NAVIGATE_TO_RULE_TEST_ID } from './test_ids';

/**
 * Footer in rule preview panel
 */
export const RulePreviewFooter = memo(() => {
  const { ruleId } = usePreviewPanelContext();
  const href = useRuleDetailsLink({ ruleId });

  return href ? (
    <FlyoutFooter data-test-subj={RULE_PREVIEW_FOOTER_TEST_ID}>
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLink
            href={href}
            target="_blank"
            data-test-subj={RULE_PREVIEW_NAVIGATE_TO_RULE_TEST_ID}
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

RulePreviewFooter.displayName = 'RulePreviewFooter';
