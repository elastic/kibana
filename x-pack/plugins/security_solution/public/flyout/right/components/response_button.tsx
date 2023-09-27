/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiButton } from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { expandDottedObject } from '../../../../common/utils/expand_dotted';
import type {
  ExpandedEventFieldsObject,
  RawEventData,
} from '../../../../common/types/response_actions';
import { useRightPanelContext } from '../context';
import { LeftPanelKey, LeftPanelResponseTab } from '../../left';
import { RESPONSE_BUTTON_TEST_ID, RESPONSE_EMPTY_TEST_ID } from './test_ids';

/**
 * Response button that opens Response section in the left panel
 */
export const ResponseButton: React.FC = () => {
  const { openLeftPanel } = useExpandableFlyoutContext();
  const { eventId, indexName, scopeId, searchHit } = useRightPanelContext();

  const expandedEventFieldsObject = searchHit
    ? (expandDottedObject((searchHit as RawEventData).fields) as ExpandedEventFieldsObject)
    : undefined;
  const responseActions =
    expandedEventFieldsObject?.kibana?.alert?.rule?.parameters?.[0].response_actions;

  const goToResponseTab = useCallback(() => {
    openLeftPanel({
      id: LeftPanelKey,
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
      {!responseActions ? (
        <p data-test-subj={RESPONSE_EMPTY_TEST_ID}>
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.response.noDataDescription"
            defaultMessage="There are no response actions defined for this event."
          />
        </p>
      ) : (
        <EuiButton
          onClick={goToResponseTab}
          iconType="documentation"
          data-test-subj={RESPONSE_BUTTON_TEST_ID}
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.right.response.responseButtonAriaLabel',
            {
              defaultMessage: 'Response',
            }
          )}
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.response.responseButtonLabel"
            defaultMessage="Response"
          />
        </EuiButton>
      )}
    </>
  );
};

ResponseButton.displayName = 'ResponseButton';
