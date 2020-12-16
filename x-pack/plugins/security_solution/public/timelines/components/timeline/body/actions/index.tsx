/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiCheckbox, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';

import { EventsTdContent, EventsTdGroupActions } from '../../styles';
import * as i18n from '../translations';
import { OnRowSelected } from '../../events';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../../helpers';

interface Props {
  ariaRowindex: number;
  actionsColumnWidth: number;
  additionalActions?: JSX.Element[];
  columnValues: string;
  checked: boolean;
  onRowSelected: OnRowSelected;
  expanded: boolean;
  eventId: string;
  loadingEventIds: Readonly<string[]>;
  onEventToggled: () => void;
  showCheckboxes: boolean;
}

const ActionsComponent: React.FC<Props> = ({
  ariaRowindex,
  actionsColumnWidth,
  additionalActions,
  checked,
  columnValues,
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
      tabIndex={0}
    >
      {showCheckboxes && (
        <div key="select-event-container" data-test-subj="select-event-container">
          <EventsTdContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
            {loadingEventIds.includes(eventId) ? (
              <EuiLoadingSpinner size="m" data-test-subj="event-loader" />
            ) : (
              <EuiCheckbox
                aria-label={i18n.CHECKBOX_FOR_ROW({ ariaRowindex, columnValues, checked })}
                data-test-subj="select-event"
                id={eventId}
                checked={checked}
                onChange={handleSelectEvent}
              />
            )}
          </EventsTdContent>
        </div>
      )}
      <div key="expand-event">
        <EventsTdContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
          <EuiToolTip data-test-subj="expand-event-tool-tip" content={i18n.VIEW_DETAILS}>
            <EuiButtonIcon
              aria-label={i18n.VIEW_DETAILS_FOR_ROW({ ariaRowindex, columnValues })}
              data-test-subj="expand-event"
              disabled={expanded}
              iconType="arrowRight"
              onClick={onEventToggled}
            />
          </EuiToolTip>
        </EventsTdContent>
      </div>

      <>{additionalActions}</>
    </EventsTdGroupActions>
  );
};

ActionsComponent.displayName = 'ActionsComponent';

export const Actions = React.memo(ActionsComponent);
