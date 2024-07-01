/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { getField } from '../../shared/utils';
import { EventKind } from '../../shared/constants/event_kinds';
import { useDocumentDetailsContext } from '../../shared/context';
import { FlyoutTour } from '../../shared/components/flyout_tour';
import { getLeftSectionTourSteps } from '../../shared/utils/tour_step_config';
import { useIsTimelineFlyoutOpen } from '../../shared/hooks/use_is_timeline_flyout_open';

/**
 * Guided tour for the left panel in details flyout
 */
export const LeftPanelTour = memo(() => {
  const { getFieldsData, isPreview } = useDocumentDetailsContext();
  const eventKind = getField(getFieldsData('event.kind'));
  const isAlert = eventKind === EventKind.signal;
  const isTimelineFlyoutOpen = useIsTimelineFlyoutOpen();
  const showTour = isAlert && !isPreview && !isTimelineFlyoutOpen;

  const tourStepContent = useMemo(() => getLeftSectionTourSteps(), []);

  return showTour ? <FlyoutTour tourStepContent={tourStepContent} totalSteps={5} /> : null;
});

LeftPanelTour.displayName = 'LeftPanelTour';
