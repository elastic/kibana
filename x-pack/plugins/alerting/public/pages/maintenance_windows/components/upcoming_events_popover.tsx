/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import moment from 'moment';
import { findIndex } from 'lodash';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  formatDate,
} from '@elastic/eui';
import * as i18n from '../translations';
import { recurringSummary } from '../helpers/recurring_summary';
import { getPresets } from '../helpers/get_presets';
import { MaintenanceWindowFindResponse } from '../types';
import { convertFromMaintenanceWindowToForm } from '../helpers/convert_from_maintenance_window_to_form';

interface UpcomingEventsPopoverProps {
  maintenanceWindowFindResponse: MaintenanceWindowFindResponse;
}

export const UpcomingEventsPopover: React.FC<UpcomingEventsPopoverProps> = React.memo(
  ({ maintenanceWindowFindResponse }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const onButtonClick = useCallback(() => {
      setIsPopoverOpen((open) => !open);
    }, []);
    const closePopover = useCallback(() => {
      setIsPopoverOpen(false);
    }, []);

    const { startDate, recurringSchedule, topEvents, presets } = useMemo(() => {
      const maintenanceWindow = convertFromMaintenanceWindowToForm(maintenanceWindowFindResponse);
      const date = moment(maintenanceWindow.startDate);
      const currentEventIndex = findIndex(
        maintenanceWindowFindResponse.events,
        (event) =>
          event.gte === maintenanceWindowFindResponse.eventStartTime &&
          event.lte === maintenanceWindowFindResponse.eventEndTime
      );
      return {
        startDate: date,
        recurringSchedule: maintenanceWindow.recurringSchedule,
        topEvents: maintenanceWindowFindResponse.events.slice(
          currentEventIndex + 1,
          currentEventIndex + 4
        ),
        presets: getPresets(date),
      };
    }, [maintenanceWindowFindResponse]);

    return (
      <EuiPopover
        button={
          <EuiButtonIcon
            data-test-subj="upcoming-events-icon-button"
            color="text"
            display="base"
            iconType="calendar"
            size="s"
            aria-label="Upcoming events"
            onClick={onButtonClick}
          />
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        anchorPosition="downCenter"
      >
        <EuiPopoverTitle data-test-subj="upcoming-events-popover-title">
          {i18n.CREATE_FORM_RECURRING_SUMMARY_PREFIX(
            recurringSummary(startDate, recurringSchedule, presets)
          )}
        </EuiPopoverTitle>
        <EuiFlexGroup direction="column" responsive={false} gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiText style={{ fontWeight: 700 }} color="subdued" size="s">
              {i18n.UPCOMING}
            </EuiText>
            <EuiSpacer size="m" />
          </EuiFlexItem>
          {topEvents.map((event, index) => (
            <EuiFlexItem
              data-test-subj="upcoming-events-popover-item"
              key={`startDate.${index}`}
              grow={false}
            >
              <EuiFlexGroup
                responsive={false}
                alignItems="center"
                justifyContent="flexStart"
                style={{ width: '300px' }}
              >
                <EuiFlexItem grow={false}>
                  <EuiIcon color="subdued" type="calendar" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText color="subdued" size="s">
                    {formatDate(event.gte, 'MM/DD/YY hh:mm A')}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              {index < topEvents.length - 1 ? (
                <EuiHorizontalRule
                  style={{ inlineSize: 'unset', marginInline: '-16px' }}
                  margin="s"
                />
              ) : null}
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiPopover>
    );
  }
);
UpcomingEventsPopover.displayName = 'UpcomingEventsPopover';
