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
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { FLYOUT_URL_PARAM } from '../../shared/hooks/url/use_sync_flyout_state_with_url';
import { CopyToClipboard } from '../../../shared/components/copy_to_clipboard';
import { useGetAlertDetailsFlyoutLink } from '../../../../timelines/components/side_panel/event_details/use_get_alert_details_flyout_link';
import { DocumentStatus } from './status';
import { useAssistant } from '../hooks/use_assistant';
import {
  ALERT_SUMMARY_CONVERSATION_ID,
  EVENT_SUMMARY_CONVERSATION_ID,
} from '../../../../common/components/event_details/translations';
import { DocumentSeverity } from './severity';
import { RiskScore } from './risk_score';
import { useBasicDataFromDetailsData } from '../../../../timelines/components/side_panel/event_details/helpers';
import { useRightPanelContext } from '../context';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { FLYOUT_HEADER_TITLE_TEST_ID, SHARE_BUTTON_TEST_ID } from './test_ids';

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
  const { dataFormattedForFieldBrowser, eventId, indexName } = useRightPanelContext();
  const { isAlert, ruleName, timestamp } = useBasicDataFromDetailsData(
    dataFormattedForFieldBrowser
  );
  const alertDetailsLink = useGetAlertDetailsFlyoutLink({
    _id: eventId,
    _index: indexName,
    timestamp,
  });

  const showShareAlertButton = isAlert && alertDetailsLink;

  const { showAssistant, promptContextId } = useAssistant({
    dataFormattedForFieldBrowser,
    isAlert,
  });

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
              <CopyToClipboard
                rawValue={alertDetailsLink}
                modifier={(value: string) => {
                  const query = new URLSearchParams(window.location.search);
                  return `${value}&${FLYOUT_URL_PARAM}=${query.get(FLYOUT_URL_PARAM)}`;
                }}
                text={
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.right.header.shareButtonLabel"
                    defaultMessage="Share Alert"
                  />
                }
                iconType={'share'}
                ariaLabel={i18n.translate(
                  'xpack.securitySolution.flyout.right.header.shareButtonAriaLabel',
                  {
                    defaultMessage: 'Share Alert',
                  }
                )}
                data-test-subj={SHARE_BUTTON_TEST_ID}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
      <EuiSpacer size="s" />
      <EuiTitle size="s">
        <h2 data-test-subj={FLYOUT_HEADER_TITLE_TEST_ID}>
          {isAlert && !isEmpty(ruleName) ? (
            ruleName
          ) : (
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.header.headerTitle"
              defaultMessage="Event details"
            />
          )}
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="row" gutterSize={isAlert ? 'm' : 'none'}>
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
