/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import { getField } from '../../shared/utils';
import { EventKind } from '../../shared/constants/event_kinds';
import { useLeftPanelContext } from '../context';
import { FlyoutTour } from '../../shared/components/flyout_tour';
import {
  getLeftSectionTourSteps,
  getRightSectionTourSteps,
  getTotalSteps,
} from '../../shared/components/tour_step_config';

/**
 * Guided tour for the left panel in details flyout
 */
export const LeftPanelTour: FC = memo(() => {
  const { getFieldsData, isPreview } = useLeftPanelContext();

  const [tourStepContent, totalSteps] = useMemo(() => {
    const eventKind = getField(getFieldsData('event.kind'));
    const isAlert = eventKind === EventKind.signal;
    return [
      getLeftSectionTourSteps(isAlert, isPreview),
      getTotalSteps(isAlert, isPreview),
      getRightSectionTourSteps(isAlert, isPreview).length,
    ];
  }, [getFieldsData, isPreview]);

  return <FlyoutTour tourStepContent={tourStepContent} totalSteps={totalSteps} />;
});

LeftPanelTour.displayName = 'LeftPanelTour';
