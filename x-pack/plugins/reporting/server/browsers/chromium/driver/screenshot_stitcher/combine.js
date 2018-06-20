/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import $streamToObservable from '@samverschueren/stream-to-observable';
import { PNG } from 'pngjs';
import * as Rx from 'rxjs';
import { mergeMap, reduce, tap, switchMap, toArray, map } from 'rxjs/operators';

// if we're only given one screenshot, and it matches the output dimensions
// we're going to skip the combination and just use it
const canUseFirstScreenshot = (screenshots, outputDimensions) => {
  if (screenshots.length !== 1) {
    return false;
  }

  const firstScreenshot = screenshots[0];
  return firstScreenshot.dimensions.width === outputDimensions.width &&
    firstScreenshot.dimensions.height === outputDimensions.height;
};

export function $combine(screenshots, outputDimensions, logger) {
  if (screenshots.length === 0) {
    return Rx.throwError('Unable to combine 0 screenshots');
  }

  if (canUseFirstScreenshot(screenshots, outputDimensions)) {
    return Rx.of(screenshots[0].data);
  }

  const pngs$ = Rx.from(screenshots).pipe(
    mergeMap(
      ({ data }) => {
        const png = new PNG();
        const buffer = Buffer.from(data, 'base64');
        const parseAsObservable = Rx.bindNodeCallback(png.parse.bind(png));
        return parseAsObservable(buffer);
      },
      ({ dimensions }, png) => ({ dimensions, png })
    )
  );

  const output$ = pngs$.pipe(
    reduce(
      (output, { dimensions, png }) => {
        // Spitting out a lot of output to help debug https://github.com/elastic/kibana/issues/19563. Once that is
        // fixed, this should probably get pared down.
        logger.debug(`Output dimensions is ${JSON.stringify(outputDimensions)}`);
        logger.debug(`Input png w: ${png.width} and h: ${png.height}`);
        logger.debug(`Creating output png with ${JSON.stringify(dimensions)}`);
        png.bitblt(output, 0, 0, dimensions.width, dimensions.height, dimensions.x, dimensions.y);
        return output;
      },
      new PNG({ width: outputDimensions.width, height: outputDimensions.height })
    )
  );

  return output$.pipe(
    tap(png => png.pack()),
    switchMap($streamToObservable),
    toArray(),
    map(chunks => Buffer.concat(chunks).toString('base64'))
  );
}
