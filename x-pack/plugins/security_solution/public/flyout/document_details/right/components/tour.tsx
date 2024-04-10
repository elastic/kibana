/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo, useCallback } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useRightPanelContext } from '../context';
import { FlyoutTour } from '../../shared/components/flyout_tour';
import { getRightSectionTourSteps } from '../../shared/utils/tour_step_config';
import { getField } from '../../shared/utils';
import { DocumentDetailsLeftPanelKey } from '../../left';
import { EventKind } from '../../shared/constants/event_kinds';
import { useIsTimelineFlyoutOpen } from '../../shared/hooks/use_is_timeline_flyout_open';

/**
 * Guided tour for the right panel in details flyout
 */
export const RightPanelTour: FC = memo(() => {
  const { openLeftPanel } = useExpandableFlyoutApi();
  const { eventId, indexName, scopeId, isPreview, getFieldsData } = useRightPanelContext();

  const eventKind = getField(getFieldsData('event.kind'));
  const isAlert = eventKind === EventKind.signal;
  const isTimelineFlyoutOpen = useIsTimelineFlyoutOpen();
  const showTour = isAlert && !isPreview && !isTimelineFlyoutOpen;

  const onPanelSwitch = useCallback(() => {
    openLeftPanel({
      id: DocumentDetailsLeftPanelKey,
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  }, [eventId, indexName, scopeId, openLeftPanel]);

  const tourStepContent = useMemo(() => getRightSectionTourSteps(), []);

  return showTour ? (
    <FlyoutTour
      tourStepContent={tourStepContent}
      totalSteps={5}
      onPanelSwitch={onPanelSwitch}
      switchStep={tourStepContent.length}
    />
  ) : null;
});

RightPanelTour.displayName = 'RightPanelTour';
