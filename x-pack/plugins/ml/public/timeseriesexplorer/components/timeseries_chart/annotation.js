/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import d3 from 'd3';

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
