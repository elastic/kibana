/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { find } from 'lodash/fp';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import type {
  EnrichedFieldInfo,
  EnrichedFieldInfoWithValues,
} from '../../../common/components/event_details/types';
import { SIGNAL_STATUS_FIELD_NAME } from '../../../timelines/components/timeline/body/renderers/constants';
import { StatusPopoverButton } from '../../../common/components/event_details/overview/status_popover_button';
import { useRightPanelContext } from '../context';
import { getEnrichedFieldInfo } from '../../../common/components/event_details/helpers';

/**
 * Checks if the field info has data to convert EnrichedFieldInfo into EnrichedFieldInfoWithValues
 */
function hasData(fieldInfo?: EnrichedFieldInfo): fieldInfo is EnrichedFieldInfoWithValues {
  return !!fieldInfo && Array.isArray(fieldInfo.values);
}

/**
 * Document details status displayed in flyout right section header
 */
export const DocumentStatus: FC = () => {
  const { closeFlyout } = useExpandableFlyoutContext();
  const { eventId, browserFields, dataFormattedForFieldBrowser, scopeId } = useRightPanelContext();

  const statusData = useMemo(() => {
    const item = find(
      { field: SIGNAL_STATUS_FIELD_NAME, category: 'kibana' },
      dataFormattedForFieldBrowser
    );
    return (
      item &&
      getEnrichedFieldInfo({
        eventId,
        contextId: scopeId,
        scopeId,
        browserFields: browserFields || {},
        item,
      })
    );
  }, [browserFields, dataFormattedForFieldBrowser, eventId, scopeId]);

  if (!statusData || !hasData(statusData)) return null;

  return (
    <StatusPopoverButton
      eventId={eventId}
      contextId={scopeId}
      enrichedFieldInfo={statusData}
      scopeId={scopeId}
      handleOnEventClosed={closeFlyout}
    />
  );
};

DocumentStatus.displayName = 'DocumentStatus';
