/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPanel } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { AlertSummaryView } from '../../../../common/components/event_details/alert_summary_view';
import { HeaderSection } from '../../../../common/components/header_section';
import { useExpandableFlyoutContext } from '../../../context';
import { useEventDetailsPanelContext } from '../event/context';
import * as i18n from '../event/translations';

export const HighlightedFields = () => {
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);

  const { flyoutScope, updateFlyoutPanels } = useExpandableFlyoutContext();
  const { dataFormattedForFieldBrowser, browserFields, searchHit } = useEventDetailsPanelContext();
  const eventId = searchHit?._id as string;

  const goToTableTab = useCallback(() => {
    updateFlyoutPanels({ right: { path: ['table'] } });
  }, [updateFlyoutPanels]);

  const isVisible = dataFormattedForFieldBrowser && browserFields && eventId && flyoutScope;

  return isVisible ? (
    <EuiPanel hasBorder hasShadow={false}>
      <EuiFlexGroup gutterSize="none" direction="column">
        <HeaderSection
          alignHeader="center"
          hideSubtitle
          outerDirection="row"
          title={i18n.HIGHLIGHTED_FIELDS_TITLE}
          titleSize="xs"
          toggleQuery={setIsPanelExpanded}
          toggleStatus={isPanelExpanded}
        />
        {isPanelExpanded && (
          <AlertSummaryView
            data={dataFormattedForFieldBrowser}
            eventId={eventId}
            browserFields={browserFields}
            isDraggable={flyoutScope === 'timelineFlyout'}
            scopeId={flyoutScope}
            title={i18n.HIGHLIGHTED_FIELDS_TITLE}
            isReadOnly={false} // TODO: set properly
            goToTable={goToTableTab}
          />
        )}
      </EuiFlexGroup>
    </EuiPanel>
  ) : null;
};
