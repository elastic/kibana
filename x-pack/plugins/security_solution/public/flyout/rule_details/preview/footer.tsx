/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FlyoutFooter } from '@kbn/security-solution-common';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { RULE_PREVIEW_FOOTER_TEST_ID, RULE_PREVIEW_OPEN_RULE_FLYOUT_TEST_ID } from './test_ids';
import { RulePanelKey } from '../right';

/**
 * Footer in rule preview panel
 */
export const PreviewFooter = memo(({ ruleId }: { ruleId: string }) => {
  const { openFlyout } = useExpandableFlyoutApi();

  const openRuleFlyout = useCallback(() => {
    openFlyout({
      right: {
        id: RulePanelKey,
        params: {
          ruleId,
        },
      },
    });
  }, [openFlyout, ruleId]);

  return (
    <FlyoutFooter data-test-subj={RULE_PREVIEW_FOOTER_TEST_ID}>
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLink
            onClick={openRuleFlyout}
            target="_blank"
            data-test-subj={RULE_PREVIEW_OPEN_RULE_FLYOUT_TEST_ID}
          >
            {i18n.translate('xpack.securitySolution.flyout.preview.rule.viewDetailsLabel', {
              defaultMessage: 'Show full rule details',
            })}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </FlyoutFooter>
  );
});

PreviewFooter.displayName = 'PreviewFooter';
