/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VFC } from 'react';
import React, { memo } from 'react';
import { NewChatById } from '@kbn/elastic-assistant';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { isEmpty } from 'lodash';
import { css } from '@emotion/react';
import { DocumentStatus } from './status';
import { useAssistant } from '../hooks/use_assistant';
import {
  ALERT_SUMMARY_CONVERSATION_ID,
  EVENT_SUMMARY_CONVERSATION_ID,
} from '../../../common/components/event_details/translations';
import { DocumentSeverity } from './severity';
import { RiskScore } from './risk_score';
import { DOCUMENT_DETAILS } from './translations';
import { useBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';
import { useRightPanelContext } from '../context';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { FLYOUT_HEADER_TITLE_TEST_ID } from './test_ids';
import { ShareButton } from './share_button';

export interface HeaderTitleProps {
  /**
   * If false, update the margin-top to compensate the fact that the expand detail button is not displayed
   */
  flyoutIsExpandable: boolean;
}

/**
 * Document details flyout right section header
 */
export const HeaderTitle: VFC<HeaderTitleProps> = memo(({ flyoutIsExpandable }) => {
  const { dataFormattedForFieldBrowser } = useRightPanelContext();
  const { isAlert, ruleName, timestamp, alertUrl } = useBasicDataFromDetailsData(
    dataFormattedForFieldBrowser
  );
  const { showAssistant, promptContextId } = useAssistant({
    dataFormattedForFieldBrowser,
    isAlert,
  });
  const showShareAlertButton = isAlert && alertUrl;

  return (
    <>
      {(showShareAlertButton || showAssistant) && (
        <EuiFlexGroup
          direction="row"
          justifyContent="flexEnd"
          gutterSize="none"
          css={css`
            margin-top: ${flyoutIsExpandable ? '-44px' : '-28px'};
            padding: 0 25px;
          `}
        >
          {showAssistant && (
            <EuiFlexItem grow={false}>
              <NewChatById
                conversationId={
                  isAlert ? ALERT_SUMMARY_CONVERSATION_ID : EVENT_SUMMARY_CONVERSATION_ID
                }
                promptContextId={promptContextId}
              />
            </EuiFlexItem>
          )}
          {showShareAlertButton && (
            <EuiFlexItem grow={false}>
              <ShareButton alertUrl={alertUrl} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
      <EuiSpacer size="s" />
      <EuiTitle size="s">
        <h4 data-test-subj={FLYOUT_HEADER_TITLE_TEST_ID}>
          {isAlert && !isEmpty(ruleName) ? ruleName : DOCUMENT_DETAILS}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="row" gutterSize="m">
        <EuiFlexItem grow={false}>
          <DocumentStatus />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {timestamp && <PreferenceFormattedDate value={new Date(timestamp)} />}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="row" gutterSize="m">
        <EuiFlexItem grow={false}>
          <DocumentSeverity />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RiskScore />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

HeaderTitle.displayName = 'HeaderTitle';
