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
import moment from 'moment';
import type { Annotation, AnnotationsTable } from '../../../common/types/annotations';
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

      // Merging overlapping annotations into bigger blocks
      let mergedAnnotations: Array<{ start: number; end: number; annotations: Annotation[] }> = [];
      const sortedAnnotationsData = [...annotationsData].sort((a, b) => a.timestamp - b.timestamp);

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
      mergedAnnotations.forEach((d) => {
        const annotationWidth = Math.max(
          d.end ? xScale(Math.min(d.end, domain.max)) - Math.max(xScale(d.start), startingXPos) : 0,
          ANNOTATION_MIN_WIDTH
        );

        const xPos = d.start >= domain.min ? xScale(d.start) : startingXPos;
        svg
          .append('rect')
          .classed('mlAnnotationRect', true)
          // If annotation is at the end, prevent overflow by shifting it back
          .attr('x', xPos + annotationWidth >= endingXPos ? endingXPos - annotationWidth : xPos)
          .attr('y', 0)
          .attr('height', ANNOTATION_CONTAINER_HEIGHT)
          .attr('width', annotationWidth)
          .on('mouseover', function () {
            const tooltipData: Array<{
              label: string;
              seriesIdentifier: { key: string; specId: string } | { key: string; specId: string };
              valueAccessor: string;
              skipHeader?: boolean;
              value?: string;
            }> = [];
            if (Array.isArray(d.annotations)) {
              const hasMergedAnnotations = d.annotations.length > 1;
              if (hasMergedAnnotations) {
                // @ts-ignore skipping header so it doesn't have other params
                tooltipData.push({ skipHeader: true });
              }
              d.annotations.forEach((item) => {
                let timespan = moment(item.timestamp).format('MMMM Do YYYY, HH:mm');

                if (typeof item.end_timestamp !== 'undefined') {
                  timespan += ` - ${moment(item.end_timestamp).format(
                    hasMergedAnnotations ? 'HH:mm' : 'MMMM Do YYYY, HH:mm'
                  )}`;
                }

                if (hasMergedAnnotations) {
                  tooltipData.push({
                    label: timespan,
                    value: `${item.annotation}`,
                    seriesIdentifier: {
                      key: 'anomaly_timeline',
                      specId: item._id ?? `${item.annotation}-${item.timestamp}-label`,
                    },
                    valueAccessor: 'annotation',
                  });
                } else {
                  tooltipData.push(
                    {
                      label: `${item.annotation}`,
                      seriesIdentifier: {
                        key: 'anomaly_timeline',
                        specId: item._id ?? `${item.annotation}-${item.timestamp}-label`,
                      },
                      valueAccessor: 'label',
                    },
                    {
                      label: `${timespan}`,
                      seriesIdentifier: {
                        key: 'anomaly_timeline',
                        specId: item._id ?? `${item.annotation}-${item.timestamp}-ts`,
                      },
                      valueAccessor: 'time',
                    }
                  );
                }

                if (
                  item.partition_field_name !== undefined &&
                  item.partition_field_value !== undefined
                ) {
                  tooltipData.push({
                    label: `${item.partition_field_name}: ${item.partition_field_value}`,
                    seriesIdentifier: {
                      key: 'anomaly_timeline',
                      specId: item._id
                        ? `${item._id}-partition`
                        : `${item.partition_field_name}-${item.partition_field_value}-label`,
                    },
                    valueAccessor: 'partition',
                  });
                }
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
