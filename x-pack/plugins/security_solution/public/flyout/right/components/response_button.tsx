/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiButton } from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { expandDottedObject } from '../../../../common/utils/expand_dotted';
import type {
  ExpandedEventFieldsObject,
  RawEventData,
} from '../../../../common/types/response_actions';
import { useRightPanelContext } from '../context';
import { LeftPanelKey, LeftPanelResponseTab } from '../../left';
import { RESPONSE_BUTTON_TEST_ID, RESPONSE_EMPTY_TEST_ID } from './test_ids';
import { RESPONSE_EMPTY, RESPONSE_TITLE } from './translations';

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

  if (!responseActions) return <div data-test-subj={RESPONSE_EMPTY_TEST_ID}>{RESPONSE_EMPTY}</div>;

  return (
    <EuiButton
      onClick={goToResponseTab}
      iconType="documentation"
      data-test-subj={RESPONSE_BUTTON_TEST_ID}
    >
      {RESPONSE_TITLE}
    </EuiButton>
  );
};

ResponseButton.displayName = 'ResponseButton';
