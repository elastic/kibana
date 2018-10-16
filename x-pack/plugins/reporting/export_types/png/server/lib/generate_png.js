/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { oncePerServer } from '../../../../server/lib/once_per_server';
import { PreserveLayout } from '../../../common/layouts/preserve_layout';
import { screenshotsObservableFactory } from '../../../common/lib/screenshots';

function generatePngPromiseFn(server) {
  const screenshotsObservable = screenshotsObservableFactory(server);

  const urlScreenshot = async (url, headers, layout) => {

    const screenShots = await screenshotsObservable(url, headers, layout);

    if (screenShots.length !== 1) {
      throw new Error(`Expected there to be 1 screenshot, but there are ${screenShots.length}`);
    }

    return screenShots[0];

  };

  return async function generatePngPromise(url, headers, layoutParams) {

    if (!layoutParams || !layoutParams.dimensions) {
      throw new Error(`LayoutParams.Dimensions is undefined.`);
    }

    const layout =  new PreserveLayout(layoutParams.dimensions);

    const screenshot = await urlScreenshot(url, headers, layout);

    return {
      content_type: 'image/png',
      content: screenshot.base64EncodedData
    };

  };

}

export const generatePngPromiseFactory = oncePerServer(generatePngPromiseFn);
