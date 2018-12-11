/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import d3 from 'd3';
import moment from 'moment';

import { ANNOTATION_TYPE } from '../../../../common/constants/annotations';
import { Annotation, Annotations } from '../../../../common/types/annotations';
import { Dictionary } from '../../../../common/types/common';

// @ts-ignore
import { mlChartTooltipService } from '../../../components/chart_tooltip/chart_tooltip_service';

import { TimeseriesChart } from './timeseries_chart';

// getAnnotationBrush() is expected to be called like getAnnotationBrush.call(this)
// so it gets passed on the context of the component it gets called from.
export function getAnnotationBrush(this: TimeseriesChart) {
  const focusXScale = this.focusXScale;

  const annotateBrush = d3.svg
    .brush()
    .x(focusXScale)
    .on('brushend', brushend.bind(this));

  // cast a reference to this so we get the latest state when brushend() gets called
  function brushend(this: TimeseriesChart) {
    const { selectedJob } = this.props;

    // TS TODO make this work with the actual types.
    const extent = annotateBrush.extent() as any;

    const timestamp = extent[0].getTime();
    const endTimestamp = extent[1].getTime();

    if (timestamp === endTimestamp) {
      this.closeFlyout();
      return;
    }

    const annotation: Annotation = {
      timestamp,
      end_timestamp: endTimestamp,
      annotation: this.state.annotation.annotation || '',
      job_id: selectedJob.job_id,
      type: ANNOTATION_TYPE.ANNOTATION,
    };

    this.showFlyout(annotation);
  }

  return annotateBrush;
}

// Used to resolve overlapping annotations in the UI.
// The returned levels can be used to create a vertical offset.
export function getAnnotationLevels(focusAnnotationData: Annotations) {
  const levels: Dictionary<number> = {};
  focusAnnotationData.forEach((d, i) => {
    if (d.key !== undefined) {
      const longerAnnotations = focusAnnotationData.filter((d2, i2) => i2 < i);
      levels[d.key] = longerAnnotations.reduce((level, d2) => {
        // For now we only support overlap removal for annotations which have both
        // `timestamp` and `end_timestamp` set.
        if (
          d.end_timestamp === undefined ||
          d2.end_timestamp === undefined ||
          d2.key === undefined
        ) {
          return level;
        }

        if (
          // d2 is completely before d
          (d2.timestamp < d.timestamp && d2.end_timestamp < d.timestamp) ||
          // d2 is completely after d
          (d2.timestamp > d.end_timestamp && d2.end_timestamp > d.end_timestamp)
        ) {
          return level;
        }
        return levels[d2.key] + 1;
      }, 0);
    }
  });
  return levels;
}

const ANNOTATION_DEFAULT_LEVEL = 1;
const ANNOTATION_LEVEL_HEIGHT = 28;
const ANNOTATION_UPPER_RECT_MARGIN = 0;
const ANNOTATION_UPPER_TEXT_MARGIN = -7;
const ANNOTATION_MIN_WIDTH = 2;
const ANNOTATION_RECT_BORDER_RADIUS = 2;
const ANNOTATION_TEXT_VERTICAL_OFFSET = 26;
const ANNOTATION_TEXT_RECT_VERTICAL_OFFSET = 12;

export function renderAnnotations(
  focusChart: d3.Selection<[]>,
  focusAnnotationData: Annotations,
  focusZoomPanelHeight: number,
  focusChartHeight: number,
  focusXScale: TimeseriesChart['focusXScale'],
  showAnnotations: boolean,
  showFocusChartTooltip: (d: Annotation, t: object) => {},
  showFlyout: TimeseriesChart['showFlyout']
) {
  const upperRectMargin = ANNOTATION_UPPER_RECT_MARGIN;
  const upperTextMargin = ANNOTATION_UPPER_TEXT_MARGIN;

  const durations: Dictionary<number> = {};
  focusAnnotationData.forEach(d => {
    if (d.key !== undefined) {
      const duration = (d.end_timestamp || 0) - d.timestamp;
      durations[d.key] = duration;
    }
  });

  // sort by duration
  focusAnnotationData.sort((a, b) => {
    if (a.key === undefined || b.key === undefined) {
      return 0;
    }
    return durations[b.key] - durations[a.key];
  });

  const levelHeight = ANNOTATION_LEVEL_HEIGHT;
  const levels = getAnnotationLevels(focusAnnotationData);

  const annotations = focusChart
    .select('.ml-annotations')
    .selectAll('g.ml-annotation')
    .data(focusAnnotationData || [], (d: Annotation) => d._id || '');

  annotations
    .enter()
    .append('g')
    .classed('ml-annotation', true);

  const rects = annotations.selectAll('.ml-annotation-rect').data((d: Annotation) => [d]);

  rects
    .enter()
    .append('rect')
    .attr('rx', ANNOTATION_RECT_BORDER_RADIUS)
    .attr('ry', ANNOTATION_RECT_BORDER_RADIUS)
    .classed('ml-annotation-rect', true)
    .on('mouseover', function(this: object, d: Annotation) {
      showFocusChartTooltip(d, this);
    })
    .on('mouseout', () => mlChartTooltipService.hide())
    .on('click', (d: Annotation) => {
      showFlyout(d);
    });

  rects
    .attr('x', (d: Annotation) => {
      const date = moment(d.timestamp);
      return focusXScale(date);
    })
    .attr('y', (d: Annotation) => {
      const level = d.key !== undefined ? levels[d.key] : ANNOTATION_DEFAULT_LEVEL;
      return focusZoomPanelHeight + 1 + upperRectMargin + level * levelHeight;
    })
    .attr('height', (d: Annotation) => {
      const level = d.key !== undefined ? levels[d.key] : ANNOTATION_DEFAULT_LEVEL;
      return focusChartHeight - 2 - upperRectMargin - level * levelHeight;
    })
    .attr('width', (d: Annotation) => {
      const s = focusXScale(moment(d.timestamp)) + 1;
      const e =
        typeof d.end_timestamp !== 'undefined'
          ? focusXScale(moment(d.end_timestamp)) - 1
          : s + ANNOTATION_MIN_WIDTH;
      const width = Math.max(ANNOTATION_MIN_WIDTH, e - s);
      return width;
    });

  rects.exit().remove();

  const textRects = annotations.selectAll('.ml-annotation-text-rect').data(d => [d]);
  const texts = annotations.selectAll('.ml-annotation-text').data(d => [d]);

  textRects
    .enter()
    .append('rect')
    .classed('ml-annotation-text-rect', true)
    .attr('rx', ANNOTATION_RECT_BORDER_RADIUS)
    .attr('ry', ANNOTATION_RECT_BORDER_RADIUS);

  texts
    .enter()
    .append('text')
    .classed('ml-annotation-text', true);

  texts
    .attr('x', (d: Annotation) => {
      const date = moment(d.timestamp);
      const x = focusXScale(date);
      return x + 17;
    })
    .attr('y', (d: Annotation) => {
      const level = d.key !== undefined ? levels[d.key] : ANNOTATION_DEFAULT_LEVEL;
      return (
        focusZoomPanelHeight +
        upperTextMargin +
        ANNOTATION_TEXT_VERTICAL_OFFSET +
        level * levelHeight
      );
    })
    .text((d: Annotation) => d.key as any);

  textRects
    .attr('x', (d: Annotation) => {
      const date = moment(d.timestamp);
      const x = focusXScale(date);
      return x + 5;
    })
    .attr('y', (d: Annotation) => {
      const level = d.key !== undefined ? levels[d.key] : ANNOTATION_DEFAULT_LEVEL;
      return (
        focusZoomPanelHeight +
        upperTextMargin +
        ANNOTATION_TEXT_RECT_VERTICAL_OFFSET +
        level * levelHeight
      );
    });

  textRects.exit().remove();
  texts.exit().remove();

  annotations.classed('ml-annotation-hidden', !showAnnotations);
  annotations.exit().remove();
}

export function highlightFocusChartAnnotation(annotation: Annotation) {
  const annotations = d3.selectAll('.ml-annotation');

  annotations.each(function(d) {
    // @ts-ignore
    const element = d3.select(this);

    if (d._id === annotation._id) {
      element
        .selectAll('.ml-annotation-text-rect')
        .classed('ml-annotation-text-rect-highlight', true);
      element.selectAll('.ml-annotation-text').classed('ml-annotation-text-highlight', true);
      element.selectAll('.ml-annotation-rect').classed('ml-annotation-rect-highlight', true);
    } else {
      element.selectAll('.ml-annotation-text-rect').classed('ml-annotation-text-rect-blur', true);
      element.selectAll('.ml-annotation-text').classed('ml-annotation-text-blur', true);
      element.selectAll('.ml-annotation-rect').classed('ml-annotation-rect-blur', true);
    }
  });
}

export function unhighlightFocusChartAnnotation() {
  const annotations = d3.selectAll('.ml-annotation');

  annotations.each(function() {
    // @ts-ignore
    const element = d3.select(this);

    element
      .selectAll('.ml-annotation-text-rect')
      .classed('ml-annotation-text-rect-highlight', false)
      .classed('ml-annotation-text-rect-blur', false);
    element
      .selectAll('.ml-annotation-rect')
      .classed('ml-annotation-rect-highlight', false)
      .classed('ml-annotation-rect-blur', false);
    element
      .selectAll('.ml-annotation-text')
      .classed('ml-annotation-text-highlight', false)
      .classed('ml-annotation-text-blur', false);
  });
}
