/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import d3 from 'd3';

import React from 'react';
import { Annotation } from '../../../../../common/types/annotations';
import { CombinedJob } from '../../../../../common/types/anomaly_detection_jobs';
import { ChartTooltipService } from '../../../components/chart_tooltip';
import { AnnotationState, AnnotationUpdatesService } from '../../../services/annotations_service';

interface Props {
  selectedJob: CombinedJob;
  tooltipService: ChartTooltipService;
}

interface State {
  annotation: Annotation | null;
}

interface TimeseriesChartProps {
  annotation: object;
  autoZoomDuration: number;
  bounds: object;
  contextAggregationInterval: object;
  contextChartData: any[];
  contextForecastData: any[];
  contextChartSelected: any;
  detectorIndex: number;
  focusAggregationInterval: object;
  focusAnnotationData: Annotation[];
  focusChartData: any[];
  focusForecastData: any[];
  modelPlotEnabled: boolean;
  renderFocusChartOnly: boolean;
  selectedJob: CombinedJob;
  showForecast: boolean;
  showModelBounds: boolean;
  svgWidth: number;
  swimlaneData: any[];
  zoomFrom: object;
  zoomTo: object;
  zoomFromFocusLoaded: object;
  zoomToFocusLoaded: object;
  tooltipService: object;
}

interface TimeseriesChartIntProps {
  annotationUpdatesService: AnnotationUpdatesService;
  annotationProps: AnnotationState;
}

declare class TimeseriesChart extends React.Component<Props & TimeseriesChartIntProps, any> {
  focusXScale: d3.scale.Ordinal<{}, number>;
}
