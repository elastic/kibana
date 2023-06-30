/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback } from 'react';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { HIGHLIGHTED_FIELDS_DETAILS_TEST_ID, HIGHLIGHTED_FIELDS_TITLE_TEST_ID } from './test_ids';
import { AlertSummaryView } from '../../../common/components/event_details/alert_summary_view';
import { HIGHLIGHTED_FIELDS_TITLE } from './translations';
import { useRightPanelContext } from '../context';
import { RightPanelKey, RightPanelTableTabPath } from '..';

/**
 * Component that displays the highlighted fields in the right panel under the Investigation section.
 * It leverages the existing {@link AlertSummaryView} component.
 * // TODO will require improvements https://github.com/elastic/security-team/issues/6428
 */
export const HighlightedFields: FC = () => {
  const { openRightPanel } = useExpandableFlyoutContext();
  const { eventId, indexName, dataFormattedForFieldBrowser, browserFields, scopeId } =
    useRightPanelContext();

  const goToTableTab = useCallback(() => {
    openRightPanel({
      id: RightPanelKey,
      path: RightPanelTableTabPath,
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  }, [eventId, indexName, openRightPanel, scopeId]);

  if (!dataFormattedForFieldBrowser || !browserFields || !eventId) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem data-test-subj={HIGHLIGHTED_FIELDS_TITLE_TEST_ID}>
        <EuiTitle size="xxs">
          <h5>{HIGHLIGHTED_FIELDS_TITLE}</h5>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem data-test-subj={HIGHLIGHTED_FIELDS_DETAILS_TEST_ID}>
        <EuiPanel hasBorder hasShadow={false}>
          <AlertSummaryView // TODO consider using x-pack/plugins/security_solution/public/common/components/event_details/summary_view.tsx instead if the link to the table have to be removed
            data={dataFormattedForFieldBrowser}
            eventId={eventId}
            browserFields={browserFields}
            isDraggable={false}
            scopeId={scopeId}
            title={''}
            isReadOnly={false} // TODO: set properly
            goToTable={goToTableTab}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
