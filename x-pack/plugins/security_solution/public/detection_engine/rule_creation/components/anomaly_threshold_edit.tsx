/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseField } from '../../../shared_imports';
import { AnomalyThresholdSlider } from '../../rule_creation_ui/components/anomaly_threshold_slider';

const componentProps = {
  describedByIds: ['anomalyThreshold'],
};

interface AnomalyThresholdEditProps {
  path: string;
}

export function AnomalyThresholdEdit({ path }: AnomalyThresholdEditProps): JSX.Element {
  return (
    <UseField path={path} component={AnomalyThresholdSlider} componentProps={componentProps} />
  );
}
