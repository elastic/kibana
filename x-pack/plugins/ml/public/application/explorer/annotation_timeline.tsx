/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type PropsWithChildren, useEffect } from 'react';
import d3 from 'd3';
import { scaleTime } from 'd3-scale';
import { type ChartTooltipService, type TooltipData } from '../components/chart_tooltip';
import { useCurrentThemeVars } from '../contexts/kibana';
import { Y_AXIS_LABEL_PADDING, Y_AXIS_LABEL_WIDTH } from './constants';

export interface AnnotationTimelineProps<T extends { timestamp: number; end_timestamp?: number }> {
  label: string;
  data: T[];
  domain: {
    min: number;
    max: number;
  };
  getTooltipContent: (item: T, hasMergedAnnotations: boolean) => TooltipData;
  tooltipService: ChartTooltipService;
  chartWidth: number;
}

const ANNOTATION_CONTAINER_HEIGHT = 12;
const ANNOTATION_MIN_WIDTH = 8;

/**
 * Reusable component for rendering annotation-like items on a timeline.
 */
export const AnnotationTimeline = <T extends { timestamp: number; end_timestamp?: number }>({
  data,
  domain,
  label,
  tooltipService,
  chartWidth,
  getTooltipContent,
}: PropsWithChildren<AnnotationTimelineProps<T>>): ReturnType<FC> => {
  const canvasRef = React.useRef<HTMLDivElement | null>(null);
  const { euiTheme } = useCurrentThemeVars();

  useEffect(
    function renderChart() {
      if (!(canvasRef.current !== null && Array.isArray(data))) return;

      const chartElement = d3.select(canvasRef.current);
      chartElement.selectAll('*').remove();

      const dimensions = canvasRef.current.getBoundingClientRect();

      const startingXPos = Y_AXIS_LABEL_WIDTH;
      const endingXPos = dimensions.width;

      const svg = chartElement
        .append('svg')
        .attr('width', '100%')
        .attr('height', ANNOTATION_CONTAINER_HEIGHT);

      const xScale = scaleTime().domain([domain.min, domain.max]).range([startingXPos, endingXPos]);

      // Add Annotation y axis label
      svg
        .append('text')
        .attr('text-anchor', 'end')
        .attr('class', 'swimlaneAnnotationLabel')
        .text(label)
        .attr('x', Y_AXIS_LABEL_WIDTH - Y_AXIS_LABEL_PADDING)
        .attr('y', ANNOTATION_CONTAINER_HEIGHT / 2)
        .attr('dominant-baseline', 'middle')
        .style('fill', euiTheme.euiTextSubduedColor)
        .style('font-size', euiTheme.euiFontSizeXS);

      // Add border
      svg
        .append('rect')
        .attr('x', startingXPos)
        .attr('y', 0)
        .attr('height', ANNOTATION_CONTAINER_HEIGHT)
        .attr('width', endingXPos - startingXPos)
        .style('stroke', euiTheme.euiBorderColor)
        .style('fill', 'none')
        .style('stroke-width', 1);

      // Merging overlapping annotations into bigger blocks
      let mergedAnnotations: Array<{ start: number; end: number; annotations: T[] }> = [];
      const sortedAnnotationsData = [...data].sort((a, b) => a.timestamp - b.timestamp);

      if (sortedAnnotationsData.length > 0) {
        let lastEndTime =
          sortedAnnotationsData[0].end_timestamp ?? sortedAnnotationsData[0].timestamp;

        mergedAnnotations = [
          {
            start: sortedAnnotationsData[0].timestamp,
            end: lastEndTime,
            annotations: [sortedAnnotationsData[0]],
          },
        ];

        for (let i = 1; i < sortedAnnotationsData.length; i++) {
          if (sortedAnnotationsData[i].timestamp < lastEndTime) {
            const itemToMerge = mergedAnnotations.pop();
            if (itemToMerge) {
              const newMergedItem = {
                ...itemToMerge,
                end: lastEndTime,
                annotations: [...itemToMerge.annotations, sortedAnnotationsData[i]],
              };
              mergedAnnotations.push(newMergedItem);
            }
          } else {
            lastEndTime =
              sortedAnnotationsData[i].end_timestamp ?? sortedAnnotationsData[i].timestamp;

            mergedAnnotations.push({
              start: sortedAnnotationsData[i].timestamp,
              end: lastEndTime,
              annotations: [sortedAnnotationsData[i]],
            });
          }
        }
      }

      // Add annotation marker
      mergedAnnotations.forEach((mergedAnnotation) => {
        const annotationWidth = Math.max(
          mergedAnnotation.end
            ? (xScale(Math.min(mergedAnnotation.end, domain.max)) as number) -
                Math.max(xScale(mergedAnnotation.start) as number, startingXPos)
            : 0,
          ANNOTATION_MIN_WIDTH
        );

        const xPos =
          mergedAnnotation.start >= domain.min
            ? (xScale(mergedAnnotation.start) as number)
            : startingXPos;
        svg
          .append('rect')
          .classed('mlAnnotationRect', true)
          // If annotation is at the end, prevent overflow by shifting it back
          .attr('x', xPos + annotationWidth >= endingXPos ? endingXPos - annotationWidth : xPos)
          .attr('y', 0)
          .attr('height', ANNOTATION_CONTAINER_HEIGHT)
          .attr('width', annotationWidth)
          .on('mouseover', function (this: HTMLElement) {
            let tooltipData: TooltipData = [];
            if (Array.isArray(mergedAnnotation.annotations)) {
              const hasMergedAnnotations = mergedAnnotation.annotations.length > 1;
              if (hasMergedAnnotations) {
                // @ts-ignore skipping header so it doesn't have other params
                tooltipData.push({ skipHeader: true });
              }
              tooltipData = [
                ...tooltipData,
                ...mergedAnnotation.annotations
                  .map((item) => getTooltipContent(item, hasMergedAnnotations))
                  .flat(),
              ];
            }

            tooltipService.show(tooltipData, this);
          })
          .on('mouseout', () => tooltipService.hide());
      });
    },
    [
      chartWidth,
      domain,
      data,
      tooltipService,
      label,
      euiTheme.euiTextSubduedColor,
      euiTheme.euiFontSizeXS,
      euiTheme.euiBorderColor,
      getTooltipContent,
    ]
  );

  return <div ref={canvasRef} />;
};
