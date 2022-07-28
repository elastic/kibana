/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { indexOf } from 'lodash';
import { EuiContextMenuItem } from '@elastic/eui';
import type { Ecs } from '../../../../../common/ecs';
import { TimelineId } from '../../../../../common/types';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { ACTION_ADD_EVENT_FILTER } from '../translations';
import * as i18n from '../translations';

export const useEventFilterAction = ({
  onAddEventFilterClick,
  ecsRowData,
  timelineId,
  tooltipMessage,
}: {
  onAddEventFilterClick: () => void;
  ecsRowData?: Ecs;
  timelineId: string;
  tooltipMessage?: string;
}) => {
  const isEvent = useMemo(() => indexOf(ecsRowData?.event?.kind, 'event') !== -1, [ecsRowData]);
  const isAgentEndpoint = useMemo(
    () => ecsRowData?.agent?.type?.includes('endpoint'),
    [ecsRowData]
  );
  const isEndpointEvent = useMemo(() => isEvent && isAgentEndpoint, [isEvent, isAgentEndpoint]);
  const { loading: canAccessEndpointManagementLoading, canAccessEndpointManagement } =
    useUserPrivileges().endpointPrivileges;
  const canCreateEndpointEventFilters = useMemo(
    () => !canAccessEndpointManagementLoading && canAccessEndpointManagement,
    [canAccessEndpointManagement, canAccessEndpointManagementLoading]
  );
  const timelineIdAllowsAddEndpointEventFilter = useMemo(
    () => timelineId === TimelineId.hostsPageEvents || timelineId === TimelineId.usersPageEvents,
    [timelineId]
  );
  const disabled =
    !isEndpointEvent || !canCreateEndpointEventFilters || !timelineIdAllowsAddEndpointEventFilter;
  const toolTipToRender = !timelineIdAllowsAddEndpointEventFilter
    ? i18n.ACTION_ADD_EVENT_FILTER_DISABLED_TOOLTIP
    : undefined;
  const eventFilterActionItems = useMemo(
    () => [
      <EuiContextMenuItem
        key="add-event-filter-menu-item"
        data-test-subj="add-event-filter-menu-item"
        onClick={onAddEventFilterClick}
        disabled={disabled}
        toolTipContent={toolTipToRender}
      >
        {ACTION_ADD_EVENT_FILTER}
      </EuiContextMenuItem>,
    ],
    [onAddEventFilterClick, disabled, toolTipToRender]
  );
  return { eventFilterActionItems };
};
