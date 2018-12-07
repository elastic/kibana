/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import d3 from 'd3';
import moment from 'moment';

import { Annotation, Annotations } from '../../../../common/types/annotations';

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
      result_type: 'annotation',
    };

    this.showFlyout(annotation);
  }

  return annotateBrush;
}

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
  const upperRectMargin = 25;
  const upperTextMargin = 18;

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
    .attr('y', focusZoomPanelHeight + 1 + upperRectMargin)
    .attr('height', focusChartHeight - 2 - upperRectMargin)
    .attr('width', (d: Annotation) => {
      const s = focusXScale(moment(d.timestamp)) + 1;
      const e =
        typeof d.end_timestamp !== 'undefined' ? focusXScale(moment(d.end_timestamp)) - 1 : s + 2;
      const width = Math.max(2, e - s);
      return width;
    });

  rects.exit().remove();

  const textRects = annotations.selectAll('.ml-annotation-text-rect').data(d => [d]);
  const texts = annotations.selectAll('.ml-annotation-text').data(d => [d]);

  textRects
    .enter()
    .append('rect')
    .classed('ml-annotation-text-rect', true)
    .attr('rx', 2)
    .attr('ry', 2);

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
    .attr('y', focusZoomPanelHeight + upperTextMargin + 26)
    .text((d: Annotation) => d.key as any);

  textRects
    .attr('x', (d: Annotation) => {
      const date = moment(d.timestamp);
      const x = focusXScale(date);
      return x + 5;
    })
    .attr('y', focusZoomPanelHeight + upperTextMargin + 12);

  textRects.exit().remove();
  texts.exit().remove();

  annotations.classed('ml-annotation-hidden', !showAnnotations);
  annotations.exit().remove();
}
