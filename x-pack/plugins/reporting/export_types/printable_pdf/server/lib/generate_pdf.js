/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { toArray, mergeMap } from 'rxjs/operators';
import moment from 'moment';
import { pdf } from './pdf';
import { groupBy } from 'lodash';
import { oncePerServer } from '../../../../server/lib/once_per_server';
import { screenshotsObservableFactory } from './screenshots';
import { createLayout } from './layouts';

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


function generatePdfObservableFn(server) {
  const screenshotsObservable = screenshotsObservableFactory(server);
  const captureConcurrency = 1;

  const urlScreenshotsObservable = (urls, conditionalHeaders, layout, browserTimezone) => {
    return Rx.from(urls).pipe(
      mergeMap(url => screenshotsObservable(url, conditionalHeaders, layout, browserTimezone),
        (outer, inner) => inner,
        captureConcurrency
      )
    );
  };


  const createPdfWithScreenshots = async ({ title, browserTimezone, urlScreenshots, layout, logo }) => {
    const pdfOutput = pdf.create(layout, logo);

    if (title) {
      const timeRange = getTimeRange(urlScreenshots);
      title += (timeRange) ? ` — ${formatDate(timeRange.from, browserTimezone)} to ${formatDate(timeRange.to, browserTimezone)}` : '';
      pdfOutput.setTitle(title);
    }

    urlScreenshots.forEach(({ screenshots }) => {
      screenshots.forEach(screenshot => {
        pdfOutput.addImage(screenshot.base64EncodedData, {
          title: screenshot.title,
          description: screenshot.description,
        });
      });
    });

    pdfOutput.generate();
    const buffer = await pdfOutput.getBuffer();
    return buffer;
  };


  return function generatePdfObservable(title, urls, browserTimezone, conditionalHeaders, layoutParams, logo) {

    const layout = createLayout(server, layoutParams);

    const screenshots$ = urlScreenshotsObservable(urls, conditionalHeaders, layout, browserTimezone);

    return screenshots$.pipe(
      toArray(),
      mergeMap(urlScreenshots => createPdfWithScreenshots({ title, browserTimezone, urlScreenshots, layout, logo }))
    );
  };
}

export const generatePdfObservableFactory = oncePerServer(generatePdfObservableFn);
