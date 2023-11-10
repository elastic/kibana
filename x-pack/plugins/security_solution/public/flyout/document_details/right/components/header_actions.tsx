/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VFC } from 'react';
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FLYOUT_URL_PARAM } from '../../shared/hooks/url/use_sync_flyout_state_with_url';
import { CopyToClipboard } from '../../../shared/components/copy_to_clipboard';
import { useGetAlertDetailsFlyoutLink } from '../../../../timelines/components/side_panel/event_details/use_get_alert_details_flyout_link';
import { useBasicDataFromDetailsData } from '../../../../timelines/components/side_panel/event_details/helpers';
import { useRightPanelContext } from '../context';
import { SHARE_BUTTON_TEST_ID } from './test_ids';

/**
 * Actions displayed in the header menu in the right section of alerts flyout
 */
export const HeaderActions: VFC = memo(() => {
  const { dataFormattedForFieldBrowser, eventId, indexName } = useRightPanelContext();
  const { isAlert, timestamp } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

  const alertDetailsLink = useGetAlertDetailsFlyoutLink({
    _id: eventId,
    _index: indexName,
    timestamp,
  });

  const showShareAlertButton = isAlert && alertDetailsLink;

  return (
    <EuiFlexGroup direction="row" justifyContent="flexEnd">
      {showShareAlertButton && (
        <EuiFlexItem grow={false}>
          <CopyToClipboard
            rawValue={alertDetailsLink}
            modifier={(value: string) => {
              const query = new URLSearchParams(window.location.search);
              return `${value}&${FLYOUT_URL_PARAM}=${query.get(FLYOUT_URL_PARAM)}`;
            }}
            iconType={'share'}
            color={'text'}
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
  );
});

HeaderActions.displayName = 'HeaderActions';
