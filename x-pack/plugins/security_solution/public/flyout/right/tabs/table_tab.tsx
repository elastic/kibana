/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { TimelineTabs } from '../../../../common/types';
import { EventFieldsBrowser } from '../../../common/components/event_details/event_fields_browser';
import { useRightPanelContext } from '../context';

/**
 * Table view displayed in the document details expandable flyout right section
 */
export const TableTab: FC = memo(() => {
  const { browserFields, dataFormattedForFieldBrowser, eventId } = useRightPanelContext();

  return (
    <EventFieldsBrowser
      browserFields={browserFields}
      data={dataFormattedForFieldBrowser}
      eventId={eventId}
      isDraggable={false}
      timelineTabType={TimelineTabs.query}
      scopeId={'alert-details-flyout'}
      isReadOnly={false}
    />
  );
});

TableTab.displayName = 'TableTab';
