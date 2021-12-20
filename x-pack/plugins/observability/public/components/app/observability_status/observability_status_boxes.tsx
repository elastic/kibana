/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ObservabilityStatusBox } from './observability_status_box';

export interface ObservabilityStatusProps {
  boxes: Array<{
    dataSource: string;
    hasData: boolean;
    description: string;
    modules: Array<{ name: string; hasData: boolean }>;
    integrationLink: string;
    learnMoreLink: string;
  }>;
}

export function ObservabilityStatusBoxes({ boxes }: ObservabilityStatusProps) {
  return (
    <div>
      {boxes.map((box) => (
        <ObservabilityStatusBox {...box} />
      ))}
    </div>
  );
}
