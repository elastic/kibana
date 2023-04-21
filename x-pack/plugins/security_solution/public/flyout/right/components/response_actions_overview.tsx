/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiSpacer, EuiTitle, EuiButtonEmpty } from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { useRightPanelContext } from '../context';
import {
  ENTITIES_HEADER_TEST_ID,
  ENTITIES_CONTENT_TEST_ID,
  ENTITIES_VIEW_ALL_BUTTON_TEST_ID,
} from './test_ids';
import { VIEW_ALL, RESPONSE_ACTIONS_TITLE, RESPONSE_ACTIONS_TEXT } from './translations';
import { getField } from '../../shared/utils';
import { LeftPanelKey, LeftPanelResponseActionsTabPath } from '../../left';

/**
 * Entities section under Insights section, overview tab. It contains a preview of host and user information.
 */
export const ResponseActionsOverview: React.FC = () => {
  const { eventId, getFieldsData, indexName } = useRightPanelContext();
  const { openLeftPanel } = useExpandableFlyoutContext();
  const hostName = getField(getFieldsData('host.name'));
  const userName = getField(getFieldsData('user.name'));

  const goToResponseActionsTab = useCallback(() => {
    openLeftPanel({
      id: LeftPanelKey,
      path: LeftPanelResponseActionsTabPath,
      params: {
        id: eventId,
        indexName,
      },
    });
  }, [eventId, openLeftPanel, indexName]);

  if (!eventId || (!userName && !hostName)) {
    return null;
  }

  return (
    <>
      <EuiTitle size="xxs" data-test-subj={ENTITIES_HEADER_TEST_ID}>
        <h5>{RESPONSE_ACTIONS_TITLE}</h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup data-test-subj={ENTITIES_CONTENT_TEST_ID} direction="column" gutterSize="s">
        <EuiButtonEmpty
          onClick={goToResponseActionsTab}
          iconType="arrowStart"
          iconSide="left"
          size="s"
          data-test-subj={ENTITIES_VIEW_ALL_BUTTON_TEST_ID}
        >
          {VIEW_ALL(RESPONSE_ACTIONS_TEXT)}
        </EuiButtonEmpty>
      </EuiFlexGroup>
    </>
  );
};

ResponseActionsOverview.displayName = 'ResponseActionsOverview';
