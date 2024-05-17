/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import React, { memo, useMemo, useCallback } from 'react';
import { FlyoutTour } from '../../shared/components/flyout_tour';
import { EventKind } from '../../shared/constants/event_kinds';
import {
  DocumentDetailsLeftPanelKey,
  DocumentDetailsRightPanelKey,
} from '../../shared/constants/panel_keys';
import { useIsTimelineFlyoutOpen } from '../../shared/hooks/use_is_timeline_flyout_open';
import { getField } from '../../shared/utils';
import {
  getLeftSectionTourSteps,
  getRightSectionTourSteps,
} from '../../shared/utils/tour_step_config';
import { useRightPanelContext } from '../context';

/**
 * Guided tour for the right panel in details flyout
 */
export const RightPanelTour = memo(() => {
  const { openLeftPanel, openRightPanel } = useExpandableFlyoutApi();
  const { eventId, indexName, scopeId, isPreview, getFieldsData } = useRightPanelContext();

  const eventKind = getField(getFieldsData('event.kind'));
  const isAlert = eventKind === EventKind.signal;
  const isTimelineFlyoutOpen = useIsTimelineFlyoutOpen();
  const showTour = isAlert && !isPreview && !isTimelineFlyoutOpen;

  const goToLeftPanel = useCallback(() => {
    openLeftPanel({
      id: DocumentDetailsLeftPanelKey,
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  }, [eventId, indexName, scopeId, openLeftPanel]);

  const goToOverviewTab = useCallback(() => {
    openRightPanel({
      id: DocumentDetailsRightPanelKey,
      path: { tab: 'overview' },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  }, [eventId, indexName, scopeId, openRightPanel]);

  const tourStepContent = useMemo(
    // we append the left tour steps here to support the scenarios where the flyout left section is already expanded when starting the tour
    () => [...getRightSectionTourSteps(), ...getLeftSectionTourSteps()],
    []
  );

  return showTour ? (
    <FlyoutTour
      tourStepContent={tourStepContent}
      totalSteps={5}
      goToOverviewTab={goToOverviewTab}
      goToLeftPanel={goToLeftPanel}
    />
  ) : null;
});

RightPanelTour.displayName = 'RightPanelTour';
