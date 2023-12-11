/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { usePreviewPanelContext } from '../context';
import { RenderRuleName } from '../../../../timelines/components/timeline/body/renderers/formatted_field_helpers';
import { SIGNAL_RULE_NAME_FIELD_NAME } from '../../../../timelines/components/timeline/body/renderers/constants';
import { FlyoutFooter } from '../../../shared/components/flyout_footer';
import { RULE_PREVIEW_FOOTER_TEST_ID } from './test_ids';

/**
 * Footer in rule preview panel
 */
export const RulePreviewFooter: React.FC = memo(() => {
  const { scopeId, eventId, ruleId } = usePreviewPanelContext();

  return ruleId ? (
    <FlyoutFooter data-test-subj={RULE_PREVIEW_FOOTER_TEST_ID}>
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <RenderRuleName
            contextId={scopeId}
            eventId={eventId}
            fieldName={SIGNAL_RULE_NAME_FIELD_NAME}
            fieldType={'string'}
            isAggregatable={false}
            isDraggable={false}
            linkValue={ruleId}
            value={i18n.translate('xpack.securitySolution.flyout.preview.rule.viewDetailsLabel', {
              defaultMessage: 'Show rule details',
            })}
            openInNewTab
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </FlyoutFooter>
  ) : null;
});

RulePreviewFooter.displayName = 'RulePreviewFooter';
