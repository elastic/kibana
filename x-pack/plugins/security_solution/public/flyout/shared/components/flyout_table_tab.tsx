/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { ColumnsProvider } from '../../../common/components/event_details/event_fields_browser';
import { EventFieldsBrowser } from '../../../common/components/event_details/event_fields_browser';
import { TimelineTabs } from '../../../../common/types';

/**
 * Table view displayed in the document details expandable flyout right section
 */
// TODO: MOVE TO FLYOUT FOLDER - https://github.com/elastic/security-team/issues/7462
export const FlyoutTableTab = memo(
  ({
    eventId,
    browserFields,
    dataFormattedForFieldBrowser,
    scopeId,
    columnsProvider,
  }: {
    eventId: string;
    browserFields: BrowserFields;
    dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
    scopeId: string;
    columnsProvider: ColumnsProvider;
  }) => {
    return (
      <EventFieldsBrowser
        browserFields={browserFields}
        data={dataFormattedForFieldBrowser}
        eventId={eventId}
        isDraggable={false}
        timelineTabType={TimelineTabs.query} // This is done to allow filter actions to update the query tab only
        scopeId={scopeId}
        isReadOnly={false}
        columnsProvider={columnsProvider}
      />
    );
  }
);
FlyoutTableTab.displayName = 'FlyoutTableTab';
