/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import d3 from 'd3';
import { scaleTime } from 'd3-scale';
import { i18n } from '@kbn/i18n';
import { formatHumanReadableDateTimeSeconds } from '../../../common/util/date_utils';
import { AnnotationsTable } from '../../../common/types/annotations';
import { ChartTooltipService } from '../components/chart_tooltip';
import { useCurrentEuiTheme } from '../components/color_range_legend';

export const Y_AXIS_LABEL_WIDTH = 170;
export const Y_AXIS_LABEL_PADDING = 8;
const ANNOTATION_CONTAINER_HEIGHT = 12;
const ANNOTATION_MIN_WIDTH = 8;

interface SwimlaneAnnotationContainerProps {
  chartWidth: number;
  domain: {
    min: number;
    max: number;
  };
  annotationsData?: AnnotationsTable['annotationsData'];
  tooltipService: ChartTooltipService;
}

export const SwimlaneAnnotationContainer: FC<SwimlaneAnnotationContainerProps> = ({
  chartWidth,
  domain,
  annotationsData,
  tooltipService,
}) => {
  const canvasRef = React.useRef<HTMLDivElement | null>(null);

  const { euiTheme } = useCurrentEuiTheme();

  useEffect(() => {
    if (canvasRef.current !== null && Array.isArray(annotationsData)) {
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
        .text(
          i18n.translate('xpack.ml.explorer.swimlaneAnnotationLabel', {
            defaultMessage: 'Annotations',
          })
        )
        .attr('x', Y_AXIS_LABEL_WIDTH - Y_AXIS_LABEL_PADDING)
        .attr('y', ANNOTATION_CONTAINER_HEIGHT / 2)
        .attr('alignment-baseline', 'middle')
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

      // Add annotation marker
      annotationsData.forEach((d) => {
        const annotationWidth = Math.max(
          d.end_timestamp
            ? xScale(Math.min(d.end_timestamp, domain.max)) -
                Math.max(xScale(d.timestamp), startingXPos)
            : 0,
          ANNOTATION_MIN_WIDTH
        );

        const xPos = d.timestamp >= domain.min ? xScale(d.timestamp) : startingXPos;
        svg
          .append('rect')
          .classed('mlAnnotationRect', true)
          // If annotation is at the end, prevent overflow by shifting it back
          .attr('x', xPos + annotationWidth >= endingXPos ? endingXPos - annotationWidth : xPos)
          .attr('y', 0)
          .attr('height', ANNOTATION_CONTAINER_HEIGHT)
          .attr('width', annotationWidth)
          .on('mouseover', function () {
            const startingTime = formatHumanReadableDateTimeSeconds(d.timestamp);
            const endingTime =
              d.end_timestamp !== undefined
                ? formatHumanReadableDateTimeSeconds(d.end_timestamp)
                : undefined;

            const timeLabel = endingTime ? `${startingTime} - ${endingTime}` : startingTime;

            const tooltipData = [
              {
                label: `${d.annotation}`,
                seriesIdentifier: {
                  key: 'anomaly_timeline',
                  specId: d._id ?? `${d.annotation}-${d.timestamp}-label`,
                },
                valueAccessor: 'label',
              },
              {
                label: `${timeLabel}`,
                seriesIdentifier: {
                  key: 'anomaly_timeline',
                  specId: d._id ?? `${d.annotation}-${d.timestamp}-ts`,
                },
                valueAccessor: 'time',
              },
            ];
            if (d.partition_field_name !== undefined && d.partition_field_value !== undefined) {
              tooltipData.push({
                label: `${d.partition_field_name}: ${d.partition_field_value}`,
                seriesIdentifier: {
                  key: 'anomaly_timeline',
                  specId: d._id
                    ? `${d._id}-partition`
                    : `${d.partition_field_name}-${d.partition_field_value}-label`,
                },
                valueAccessor: 'partition',
              });
            }
            // @ts-ignore we don't need all the fields for tooltip to show
            tooltipService.show(tooltipData, this);
          })
          .on('mouseout', () => tooltipService.hide());
      });
    }
  }, [chartWidth, domain, annotationsData, tooltipService]);

  return <div ref={canvasRef} />;
};
