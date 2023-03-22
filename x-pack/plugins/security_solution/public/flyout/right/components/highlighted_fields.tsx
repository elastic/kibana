/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import type { VFC } from 'react';
import React, { useCallback, useState } from 'react';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { HIGHLIGHTED_FIELDS_TEST_ID } from './test_ids';
import { AlertSummaryView } from '../../../common/components/event_details/alert_summary_view';
import { HIGHLIGHTED_FIELDS_TITLE } from './translations';
import { HeaderSection } from '../../../common/components/header_section';
import { useRightPanelContext } from '../context';
import { RightPanelKey, RightPanelTableTabPath } from '..';

export interface HighlightedFieldsProps {
  /**
   * Boolean to allow the component to be expanded or collapsed on first render
   */
  expanded?: boolean;
}

export const HighlightedFields: VFC<HighlightedFieldsProps> = ({ expanded = false }) => {
  const [isPanelExpanded, setIsPanelExpanded] = useState(expanded);

  const { openRightPanel } = useExpandableFlyoutContext();
  const { eventId, indexName, dataFormattedForFieldBrowser, browserFields } =
    useRightPanelContext();

  const goToTableTab = useCallback(() => {
    openRightPanel({
      id: RightPanelKey,
      path: RightPanelTableTabPath,
      params: {
        id: eventId,
        indexName,
      },
    });
  }, [eventId, indexName, openRightPanel]);

  if (!dataFormattedForFieldBrowser || !browserFields || !eventId) {
    return <></>;
  }

  return (
    <EuiFlexGroup gutterSize="none" direction="column" data-test-subj={HIGHLIGHTED_FIELDS_TEST_ID}>
      <HeaderSection
        alignHeader="center"
        hideSubtitle
        outerDirection="row"
        title={HIGHLIGHTED_FIELDS_TITLE}
        titleSize="xs"
        toggleQuery={setIsPanelExpanded}
        toggleStatus={isPanelExpanded}
      />
      {isPanelExpanded && (
        <AlertSummaryView
          data={dataFormattedForFieldBrowser}
          eventId={eventId}
          browserFields={browserFields}
          isDraggable={false}
          scopeId={'global'}
          title={HIGHLIGHTED_FIELDS_TITLE}
          isReadOnly={false} // TODO: set properly
          goToTable={goToTableTab}
        />
      )}
    </EuiFlexGroup>
  );
};
