/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { getField } from '../../shared/utils';
import { AlertReasonPreviewPanel, PreviewPanelKey } from '../../preview';
import {
  REASON_DETAILS_PREVIEW_BUTTON_TEST_ID,
  REASON_DETAILS_TEST_ID,
  REASON_TITLE_TEST_ID,
} from './test_ids';
import {
  ALERT_REASON_DETAILS_TEXT,
  ALERT_REASON_TITLE,
  DOCUMENT_REASON_TITLE,
  PREVIEW_ALERT_REASON_DETAILS,
} from './translations';
import { useBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';
import { useRightPanelContext } from '../context';

/**
 * Displays the information provided by the rowRenderer. Supports multiple types of documents.
 */
export const Reason: FC = () => {
  const { eventId, indexName, scopeId, dataFormattedForFieldBrowser, getFieldsData } =
    useRightPanelContext();
  const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
  const alertReason = getField(getFieldsData(ALERT_REASON));

  const { openPreviewPanel } = useExpandableFlyoutContext();
  const openRulePreview = useCallback(() => {
    openPreviewPanel({
      id: PreviewPanelKey,
      path: { tab: AlertReasonPreviewPanel },
      params: {
        id: eventId,
        indexName,
        scopeId,
        banner: {
          title: PREVIEW_ALERT_REASON_DETAILS,
          backgroundColor: 'warning',
          textColor: 'warning',
        },
      },
    });
  }, [eventId, openPreviewPanel, indexName, scopeId]);

  const viewPreview = useMemo(
    () => (
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconType="expand"
          onClick={openRulePreview}
          iconSide="right"
          data-test-subj={REASON_DETAILS_PREVIEW_BUTTON_TEST_ID}
        >
          {ALERT_REASON_DETAILS_TEXT}
        </EuiButtonEmpty>
      </EuiFlexItem>
    ),
    [openRulePreview]
  );

  if (!dataFormattedForFieldBrowser) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem data-test-subj={REASON_TITLE_TEST_ID}>
        <EuiTitle size="xxs">
          <h5>
            {isAlert ? (
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem>
                  <h5>{ALERT_REASON_TITLE}</h5>
                </EuiFlexItem>
                {viewPreview}
              </EuiFlexGroup>
            ) : (
              DOCUMENT_REASON_TITLE
            )}
          </h5>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem data-test-subj={REASON_DETAILS_TEST_ID}>{alertReason}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

Reason.displayName = 'Reason';
