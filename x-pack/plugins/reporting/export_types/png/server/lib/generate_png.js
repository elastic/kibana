/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { toArray, mergeMap } from 'rxjs/operators';
import { oncePerServer } from '../../../../server/lib/once_per_server';
import { screenshotsObservableFactory } from '../../../common/lib/screenshots';
import { createLayout } from '../../../common/layouts';

function generatePngObservableFn(server) {
  const screenshotsObservable = screenshotsObservableFactory(server);
  const captureConcurrency = 1;

  const urlScreenshotsObservable = (urls, headers, layout) => {
    return Rx.from(urls).pipe(
      mergeMap(url => screenshotsObservable(url, headers, layout),
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

  return function generatePngObservable(urls, headers, layoutParams) {

    const layout = createLayout(server, layoutParams);

    const screenshots$ = urlScreenshotsObservable(urls, headers, layout);

    return screenshots$.pipe(
      toArray(),
      mergeMap(urlScreenshots => createPngWithScreenshots({ urlScreenshots }))
    );
  };
}

export const generatePngObservableFactory = oncePerServer(generatePngObservableFn);
