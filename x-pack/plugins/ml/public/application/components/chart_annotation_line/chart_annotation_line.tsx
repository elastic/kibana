/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { ChartAnnotationLineService } from './chart_annotation_line_service';

interface MLChartAnnotationLineProps {
  children: (chartAnnotationLineService: ChartAnnotationLineService) => React.ReactElement;
}

export const MLChartAnnotationLine: FC<MLChartAnnotationLineProps> = ({ children }) => {
  const service = useMemo(() => new ChartAnnotationLineService(), []);

  return <>{children(service)}</>;
};
