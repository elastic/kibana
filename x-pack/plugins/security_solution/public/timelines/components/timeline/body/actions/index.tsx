/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiLoadingSpinner, EuiCheckbox } from '@elastic/eui';

import { EventsTd, EventsTdContent, EventsTdGroupActions } from '../../styles';
import * as i18n from '../translations';
import { OnRowSelected } from '../../events';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../../helpers';

interface Props {
  actionsColumnWidth: number;
  additionalActions?: JSX.Element[];
  checked: boolean;
  onRowSelected: OnRowSelected;
  expanded: boolean;
  eventId: string;
  loadingEventIds: Readonly<string[]>;
  onEventToggled: () => void;
  showCheckboxes: boolean;
}

const ActionsComponent: React.FC<Props> = ({
  actionsColumnWidth,
  additionalActions,
  checked,
  expanded,
  eventId,
  loadingEventIds,
  onEventToggled,
  onRowSelected,
  showCheckboxes,
}) => {
  const handleSelectEvent = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      onRowSelected({
        eventIds: [eventId],
        isSelected: event.currentTarget.checked,
      }),
    [eventId, onRowSelected]
  );

  return (
    <EventsTdGroupActions
      actionsColumnWidth={actionsColumnWidth}
      data-test-subj="event-actions-container"
    >
      {showCheckboxes && (
        <EventsTd key="select-event-container" data-test-subj="select-event-container">
          <EventsTdContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
            {loadingEventIds.includes(eventId) ? (
              <EuiLoadingSpinner size="m" data-test-subj="event-loader" />
            ) : (
              <EuiCheckbox
                data-test-subj="select-event"
                id={eventId}
                checked={checked}
                onChange={handleSelectEvent}
              />
            )}
          </EventsTdContent>
        </EventsTd>
      )}
      <EventsTd key="expand-event">
        <EventsTdContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
          <EuiButtonIcon
            aria-label={expanded ? i18n.COLLAPSE : i18n.EXPAND}
            data-test-subj="expand-event"
            iconType={expanded ? 'eye' : 'eyeClosed'}
            id={eventId}
            onClick={onEventToggled}
          />
        </EventsTdContent>
      </EventsTd>

      <>{additionalActions}</>
    </EventsTdGroupActions>
  );
};

ActionsComponent.displayName = 'ActionsComponent';

export const Actions = React.memo(ActionsComponent);
