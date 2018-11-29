/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { toArray, mergeMap } from 'rxjs/operators';
import { oncePerServer } from '../../../../server/lib/once_per_server';
import { screenshotsObservableFactory } from '../../../common/lib/screenshots';
import { PreserveLayout } from '../../../common/layouts/preserve_layout';

function generatePngObservableFn(server) {
  const screenshotsObservable = screenshotsObservableFactory(server);
  const captureConcurrency = 1;

  const urlScreenshotsObservable = (url, conditionalHeaders, layout, browserTimezone) => {
    return Rx.of(url).pipe(
      mergeMap(url => screenshotsObservable(url, conditionalHeaders, layout, browserTimezone),
        (outer, inner) => inner,
        captureConcurrency
      )
    );
  };

  const createPngWithScreenshots = async ({ urlScreenshots }) => {

    if (urlScreenshots.length !== 1) {
      throw new Error(`Expected there to be 1 URL screenshot, but there are ${urlScreenshots.length}`);
    }
    if (urlScreenshots[0].screenshots.length !== 1) {
      throw new Error(`Expected there to be 1 screenshot, but there are ${urlScreenshots[0].screenshots.length}`);
    }

    return urlScreenshots[0].screenshots[0].base64EncodedData;

  };

  return function generatePngObservable(url, browserTimezone, conditionalHeaders, layoutParams) {

    if (!layoutParams || !layoutParams.dimensions) {
      throw new Error(`LayoutParams.Dimensions is undefined.`);
    }

    const layout =  new PreserveLayout(layoutParams.dimensions);

    const screenshots$ = urlScreenshotsObservable(url, conditionalHeaders, layout, browserTimezone);

    return screenshots$.pipe(
      toArray(),
      mergeMap(urlScreenshots => createPngWithScreenshots({ urlScreenshots }))
    );
  };
}

export const generatePngObservableFactory = oncePerServer(generatePngObservableFn);
