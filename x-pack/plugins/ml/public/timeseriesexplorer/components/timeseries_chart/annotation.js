/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import d3 from 'd3';
import moment from 'moment';

import { mlChartTooltipService } from '../../../components/chart_tooltip/chart_tooltip_service';

// getAnnotationBrush() is expected to be called like getAnnotationBrush.call(this)
// so it gets passed on the context of the component it gets called from.
export function getAnnotationBrush() {
  const focusXScale = this.focusXScale;

  const annotateBrush = d3.svg
    .brush()
    .x(focusXScale)
    //.y(focusYScale)
    .on('brush', brushmove)
    .on('brushend', brushend);

  function brushmove() {}

  // cast a reference to this so we get the latest state when brushend() gets called
  const that = this;
  function brushend() {
    const {
      // focusChartData,
      // refresh,
      selectedJob
    } = that.props;

    const extent = annotateBrush.extent();
    /*
    const data = focusChartData.filter((d) => {
      let match = false;
      if (
        (d.value >= extent[0][1] && d.value <= extent[1][1]) &&
        (d.date.getTime() >= extent[0][0].getTime() && d.date.getTime() <= extent[1][0].getTime())
      ) {
        match = true;
      }
      return match;
    }).map((d) => {
      return d.value;
    });
    */

    const timestamp = extent[0].getTime();
    const endTimestamp = extent[1].getTime();

    if (timestamp === endTimestamp) {
      that.closeFlyout();
      return;
    }

    const annotation = {
      timestamp,
      end_timestamp: endTimestamp,
      annotation: that.state.annotation.annotation || '',
      job_id: selectedJob.job_id,
      result_type: 'annotation',
    };

    that.showFlyout(annotation);
  }

  return annotateBrush;
}

export function renderAnnotations(
  focusChart,
  focusAnnotationData,
  focusZoomPanelHeight,
  focusChartHeight,
  focusXScale,
  showAnnotations,
  showFocusChartTooltip,
  showFlyout
) {
  const annotations = focusChart.select('.ml-annotations').selectAll('g.ml-annotation').data(focusAnnotationData || []);

  const annotationGroupEnter = annotations.enter()
    .append('g')
    .classed('ml-annotation', true);

  annotationGroupEnter
    .append('rect')
    .classed('ml-annotation-rect', true);

  annotationGroupEnter
    .append('text')
    .classed('ml-annotation-text', true)
    .text(d => d.annotation);

  const upperRectMargin = 25;
  const upperTextMargin = 18;

  annotations.selectAll('.ml-annotation-rect')
    .attr('x', (d) => {
      const date = moment(d.timestamp);
      return focusXScale(date);
    })
    .attr('y', focusZoomPanelHeight + 1 + upperRectMargin)
    .attr('height', focusChartHeight - 2 - upperRectMargin)
    .attr('width', (d) => {
      const s = focusXScale(moment(d.timestamp)) + 1;
      const e = (typeof d.end_timestamp !== 'undefined') ? (focusXScale(moment(d.end_timestamp)) - 1) : (s + 2);
      const width = Math.max(2, (e - s));
      return width;
    })
    .on('mouseover', function (d) {
      showFocusChartTooltip(d, this);
    })
    .on('mouseout', () => mlChartTooltipService.hide())
    .on('click', function (d) {
      console.warn('click', d);
      showFlyout(d);
    });

  annotations.selectAll('.ml-annotation-text')
    .attr('x', (d) => {
      const date = moment(d.timestamp);
      const x = focusXScale(date);
      const s = focusXScale(moment(d.timestamp)) + 1;
      const e = (typeof d.end_timestamp !== 'undefined') ? (focusXScale(moment(d.end_timestamp)) - 1) : (s + 2);
      const width = Math.max(2, (e - s));
      return x + (width / 2);
    })
    .attr('y', focusZoomPanelHeight + upperTextMargin);

  annotations.classed('ml-annotation-hidden', !showAnnotations);


  annotations.exit().remove();
}
