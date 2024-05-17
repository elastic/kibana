/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { FlyoutTour } from '../../shared/components/flyout_tour';
import { EventKind } from '../../shared/constants/event_kinds';
import { useIsTimelineFlyoutOpen } from '../../shared/hooks/use_is_timeline_flyout_open';
import { getField } from '../../shared/utils';
import { getLeftSectionTourSteps } from '../../shared/utils/tour_step_config';
import { useLeftPanelContext } from '../context';

/**
 * Guided tour for the left panel in details flyout
 */
export const LeftPanelTour = memo(() => {
  const { getFieldsData, isPreview } = useLeftPanelContext();
  const eventKind = getField(getFieldsData('event.kind'));
  const isAlert = eventKind === EventKind.signal;
  const isTimelineFlyoutOpen = useIsTimelineFlyoutOpen();
  const showTour = isAlert && !isPreview && !isTimelineFlyoutOpen;

  const tourStepContent = useMemo(() => getLeftSectionTourSteps(), []);

  return showTour ? <FlyoutTour tourStepContent={tourStepContent} totalSteps={5} /> : null;
});

LeftPanelTour.displayName = 'LeftPanelTour';
