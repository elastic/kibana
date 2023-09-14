/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import type { FC } from 'react';
import React, { useMemo, useCallback } from 'react';
import { isEmpty } from 'lodash';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { useRightPanelContext } from '../context';
import { useBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';
import {
  DESCRIPTION_DETAILS_TEST_ID,
  DESCRIPTION_TITLE_TEST_ID,
  RULE_SUMMARY_BUTTON_TEST_ID,
} from './test_ids';
import {
  DOCUMENT_DESCRIPTION_TITLE,
  RULE_DESCRIPTION_TITLE,
  RULE_SUMMARY_TEXT,
  PREVIEW_RULE_DETAILS,
} from './translations';
import { PreviewPanelKey, type PreviewPanelProps, RulePreviewPanel } from '../../preview';

/**
 * Displays the description of a document.
 * If the document is an alert we show the rule description. If the document is of another type, we show -.
 */
export const Description: FC = () => {
  const { dataFormattedForFieldBrowser, scopeId, eventId, indexName } = useRightPanelContext();
  const { isAlert, ruleDescription, ruleName, ruleId } = useBasicDataFromDetailsData(
    dataFormattedForFieldBrowser
  );
  const { openPreviewPanel } = useExpandableFlyoutContext();
  const openRulePreview = useCallback(() => {
    const PreviewPanelRulePreview: PreviewPanelProps['path'] = { tab: RulePreviewPanel };
    openPreviewPanel({
      id: PreviewPanelKey,
      path: PreviewPanelRulePreview,
      params: {
        id: eventId,
        indexName,
        scopeId,
        banner: {
          title: PREVIEW_RULE_DETAILS,
          backgroundColor: 'warning',
          textColor: 'warning',
        },
        ruleId,
      },
    });
  }, [eventId, openPreviewPanel, indexName, scopeId, ruleId]);

  const viewRule = useMemo(
    () =>
      !isEmpty(ruleName) &&
      !isEmpty(ruleId) && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="expand"
            onClick={openRulePreview}
            iconSide="right"
            data-test-subj={RULE_SUMMARY_BUTTON_TEST_ID}
          >
            {RULE_SUMMARY_TEXT}
          </EuiButtonEmpty>
        </EuiFlexItem>
      ),
    [ruleName, openRulePreview, ruleId]
  );

  if (!dataFormattedForFieldBrowser) {
    return null;
  }

  const hasRuleDescription = ruleDescription && ruleDescription.length > 0;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem data-test-subj={DESCRIPTION_TITLE_TEST_ID}>
        <EuiTitle size="xxs">
          {isAlert ? (
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem>
                <h5>{RULE_DESCRIPTION_TITLE}</h5>
              </EuiFlexItem>
              {viewRule}
            </EuiFlexGroup>
          ) : (
            <h5>{DOCUMENT_DESCRIPTION_TITLE}</h5>
          )}
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem data-test-subj={DESCRIPTION_DETAILS_TEST_ID}>
        {hasRuleDescription ? ruleDescription : '-'}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

Description.displayName = 'Description';
