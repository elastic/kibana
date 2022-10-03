/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuPanel, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { useAlertsActions } from '../../../../detections/components/alerts_table/timeline_actions/use_alerts_actions';
import type { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import {
  CHANGE_ALERT_STATUS,
  CLICK_TO_CHANGE_ALERT_STATUS,
} from '../../../../detections/components/alerts_table/translations';
import { FormattedFieldValue } from '../../../../timelines/components/timeline/body/renderers/formatted_field';
import type { EnrichedFieldInfoWithValues } from '../types';

interface StatusPopoverButtonProps {
  eventId: string;
  contextId: string;
  enrichedFieldInfo: EnrichedFieldInfoWithValues;
  indexName: string;
  scopeId: string;
  handleOnEventClosed: () => void;
}

export const StatusPopoverButton = React.memo<StatusPopoverButtonProps>(
  ({ eventId, contextId, enrichedFieldInfo, indexName, scopeId, handleOnEventClosed }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
    const closePopover = useCallback(() => setIsPopoverOpen(false), []);
    const closeAfterAction = useCallback(() => {
      closePopover();
      handleOnEventClosed();
    }, [closePopover, handleOnEventClosed]);

    const { actionItems } = useAlertsActions({
      closePopover: closeAfterAction,
      eventId,
      scopeId,
      indexName,
      alertStatus: enrichedFieldInfo.values[0] as Status,
    });

    // statusPopoverVisible includes the logic for the visibility of the popover in
    // case actionItems is an empty array ( ex, when user has read access ).
    const statusPopoverVisible = useMemo(() => actionItems.length > 0, [actionItems]);

    const button = useMemo(
      () => (
        <FormattedFieldValue
          contextId={contextId}
          eventId={eventId}
          value={enrichedFieldInfo.values[0]}
          fieldName={enrichedFieldInfo.data.field}
          linkValue={enrichedFieldInfo.linkValue}
          fieldType={enrichedFieldInfo.data.type}
          fieldFormat={enrichedFieldInfo.data.format}
          isDraggable={false}
          truncate={false}
          isButton={statusPopoverVisible}
          onClick={statusPopoverVisible ? togglePopover : undefined}
          onClickAriaLabel={CLICK_TO_CHANGE_ALERT_STATUS}
        />
      ),
      [contextId, eventId, enrichedFieldInfo, togglePopover, statusPopoverVisible]
    );

    // EuiPopover is not needed if statusPopoverVisible is false
    if (!statusPopoverVisible) {
      return button;
    }

    return (
      <EuiPopover
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        data-test-subj="alertStatus"
      >
        <EuiPopoverTitle paddingSize="m">{CHANGE_ALERT_STATUS}</EuiPopoverTitle>
        <EuiContextMenuPanel items={actionItems} />
      </EuiPopover>
    );
  }
);

StatusPopoverButton.displayName = 'StatusPopoverButton';
