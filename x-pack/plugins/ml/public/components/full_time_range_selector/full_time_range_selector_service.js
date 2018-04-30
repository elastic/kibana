/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import moment from 'moment';

import { ml } from 'plugins/ml/services/ml_api_service';

export function FullTimeRangeSelectorServiceProvider(timefilter, Notifier, $q) {
  const notify = new Notifier();

  function setFullTimeRange(indexPattern, query) {
    // load the earliest and latest time stamps for the index
    $q.when(ml.getTimeFieldRange({
      index: indexPattern.title,
      timeFieldName: indexPattern.timeFieldName,
      query
    }))
      .then((resp) => {
        timefilter.time.from = moment(resp.start.epoch).toISOString();
        timefilter.time.to = moment(resp.end.epoch).toISOString();
      })
      .catch((resp) => {
        notify.error(resp);
      });
  }

  return {
    setFullTimeRange
  };
}
