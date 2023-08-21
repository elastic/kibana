/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyToClipboard, EuiButtonEmpty, EuiCopy } from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';
import { FLYOUT_URL_PARAM } from '../../shared/hooks/url/use_sync_flyout_state_with_url';
import { FLYOUT_HEADER_SHARE_BUTTON_TEST_ID } from './test_ids';
import { SHARE } from './translations';

interface ShareButtonProps {
  /**
   * Url retrieved from the kibana.alert.url field of the document
   */
  alertUrl: string;
}

/**
 * Puts alertUrl to user's clipboard. If current query string contains synced flyout state,
 * it will be appended to the base alertUrl
 */
export const ShareButton: FC<ShareButtonProps> = ({ alertUrl }) => {
  return (
    <EuiCopy textToCopy={alertUrl}>
      {(copy) => (
        <EuiButtonEmpty
          onClick={() => {
            // NOTE: currently, it is not possible to have textToCopy computed dynamically.
            // so, we are calling copy() here to trigger the ui tooltip, and then override the link manually
            copy();
            const query = new URLSearchParams(window.location.search);
            const alertDetailsLink = `${alertUrl}&${FLYOUT_URL_PARAM}=${query.get(
              FLYOUT_URL_PARAM
            )}`;
            copyToClipboard(alertDetailsLink);
          }}
          iconType="share"
          data-test-subj={FLYOUT_HEADER_SHARE_BUTTON_TEST_ID}
        >
          {SHARE}
        </EuiButtonEmpty>
      )}
    </EuiCopy>
  );
};

ShareButton.displayName = 'ShareButton';
