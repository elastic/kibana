/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { StepFieldTrend } from '../../../../common/step_field_trend/step_field_trend';
import { useWaterfallContext } from '../context/waterfall_context';

export function WaterfallMarkerTrend({ title, field }: { title: string; field: string }) {
  const { activeStep } = useWaterfallContext();

  if (!activeStep) {
    return null;
  }

  return <StepFieldTrend field={field} title={title} step={activeStep} />;
}
