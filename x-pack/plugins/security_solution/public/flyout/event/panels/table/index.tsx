/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { TablePanel } from '../../../../common/store/flyout/model';
import { TimelineTabs } from '../../../../../common/types';
import { EventFieldsBrowser } from '../../../../common/components/event_details/event_fields_browser';
import { BackToAlertDetailsButton } from '../../components/back_to_alert_details';
import { useEventDetailsPanelContext } from '../event/context';

// TODO: If we want the table as a panel, use the below
export const EventTablePanelKey: TablePanel['panelKind'] = 'table';

export const EventTablePanel: React.FC = React.memo(() => {
  const { browserFields, searchHit, dataFormattedForFieldBrowser } = useEventDetailsPanelContext();
  const databaseDocumentID = searchHit?._id as string; // Is
  return (
    browserFields &&
    dataFormattedForFieldBrowser && (
      <div style={{ padding: '20px' }}>
        <BackToAlertDetailsButton />
        <EventFieldsBrowser
          browserFields={browserFields}
          data={dataFormattedForFieldBrowser}
          eventId={databaseDocumentID}
          isDraggable={false}
          timelineTabType={TimelineTabs.query}
          scopeId={'event-flyout'} // TODO: Update
          isReadOnly={false}
        />
      </div>
    )
  );
});

EventTablePanel.displayName = 'EventTable';

// TODO: If we want the table as a tab, use the below:

export const EventTableTab: React.FC = React.memo(() => {
  const { browserFields, searchHit, dataFormattedForFieldBrowser } = useEventDetailsPanelContext();
  const databaseDocumentID = searchHit?._id as string; // Is
  return (
    browserFields &&
    dataFormattedForFieldBrowser && (
      <EventFieldsBrowser
        browserFields={browserFields}
        data={dataFormattedForFieldBrowser}
        eventId={databaseDocumentID}
        isDraggable={false}
        timelineTabType={TimelineTabs.query}
        scopeId={'event-flyout'}
        isReadOnly={false}
      />
    )
  );
});

EventTableTab.displayName = 'EventTableTab';
