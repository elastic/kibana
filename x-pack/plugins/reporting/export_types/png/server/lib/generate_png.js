/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { toArray, mergeMap } from 'rxjs/operators';
import moment from 'moment';
import { groupBy } from 'lodash';
import { oncePerServer } from '../../../../server/lib/once_per_server';
import { screenshotsObservableFactory } from './screenshots';
import { getLayoutFactory } from './layouts';

const getTimeRange = (urlScreenshots) => {
  const grouped = groupBy(urlScreenshots.map(u => u.timeRange));
  const values = Object.values(grouped);
  if (values.length === 1) {
    return values[0][0];
  }

  return null;
};


const formatDate = (date, timezone) => {
  return moment.tz(date, timezone).format('llll');
};

function generatePngObservableFn(server) {
  const screenshotsObservable = screenshotsObservableFactory(server);
  const captureConcurrency = 1;
  const getLayout = getLayoutFactory(server);

  const urlScreenshotsObservable = (urls, headers, layout) => {
    return Rx.from(urls).pipe(
      mergeMap(url => screenshotsObservable(url, headers, layout),
        (outer, inner) => inner,
        captureConcurrency
      )
    );
  };

  const createPngWithScreenshots = async ({ title, browserTimezone, urlScreenshots }) => {
    if (title) {
      const timeRange = getTimeRange(urlScreenshots);
      title += (timeRange) ? ` — ${formatDate(timeRange.from, browserTimezone)} to ${formatDate(timeRange.to, browserTimezone)}` : '';
    }
    return urlScreenshots[0].screenshots[0].base64EncodedData;
  };

  return function generatePngObservable(title, urls, browserTimezone, headers, layoutParams, logo) {

    const layout = getLayout(layoutParams);

    const screenshots$ = urlScreenshotsObservable(urls, headers, layout);

    return screenshots$.pipe(
      toArray(),
      mergeMap(urlScreenshots => createPngWithScreenshots({ title, browserTimezone, urlScreenshots, logo }))
    );
  };
}

export const generatePngObservableFactory = oncePerServer(generatePngObservableFn);
