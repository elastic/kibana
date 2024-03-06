/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiButton } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FormattedMessage } from '@kbn/i18n-react';
import { useRightPanelContext } from '../context';
import { DocumentDetailsLeftPanelKey, LeftPanelResponseTab } from '../../left';
import { RESPONSE_BUTTON_TEST_ID } from './test_ids';

/**
 * Response button that opens Response section in the left panel
 */
export const ResponseButton: React.FC = () => {
  const { openLeftPanel } = useExpandableFlyoutApi();
  const { eventId, indexName, scopeId } = useRightPanelContext();

  const goToResponseTab = useCallback(() => {
    openLeftPanel({
      id: DocumentDetailsLeftPanelKey,
      path: { tab: LeftPanelResponseTab },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  }, [eventId, indexName, openLeftPanel, scopeId]);

  return (
    <>
      <EuiButton
        onClick={goToResponseTab}
        iconType="documentation"
        data-test-subj={RESPONSE_BUTTON_TEST_ID}
      >
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.response.responseButtonLabel"
          defaultMessage="Response"
        />
      </EuiButton>
    </>
  );
};

ResponseButton.displayName = 'ResponseButton';
