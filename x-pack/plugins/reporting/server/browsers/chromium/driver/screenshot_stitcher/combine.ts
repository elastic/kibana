/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// No types found for this package. May want to investigate an alternative with types.
// @ts-ignore: implicit any for JS file
import $streamToObservable from '@samverschueren/stream-to-observable';
import { PNG } from 'pngjs';
import * as Rx from 'rxjs';
import { map, reduce, switchMap, tap, toArray } from 'rxjs/operators';
import { Logger, Screenshot, Size } from './types';

// if we're only given one screenshot, and it matches the given size
// we're going to skip the combination and just use it
const canUseFirstScreenshot = (
  screenshots: Screenshot[],
  size: { width: number; height: number }
) => {
  if (screenshots.length !== 1) {
    return false;
  }

  const firstScreenshot = screenshots[0];
  return (
    firstScreenshot.rectangle.width === size.width &&
    firstScreenshot.rectangle.height === size.height
  );
};

/**
 * Combines the screenshot clips into a single screenshot of size `outputSize`.
 * @param screenshots - Array of screenshots to combine
 * @param outputSize - Final output size that the screenshots should match up with
 * @param logger - logger for extra debug output
 */
export function $combine(
  screenshots: Screenshot[],
  outputSize: Size,
  logger: Logger
): Rx.Observable<string> {
  logger.debug(
    `Combining screenshot clips into final, scaled output dimension of ${JSON.stringify(
      outputSize
    )}`
  );

  if (screenshots.length === 0) {
    return Rx.throwError('Unable to combine 0 screenshots');
  }

  if (canUseFirstScreenshot(screenshots, outputSize)) {
    const data = PNG.sync.write(screenshots[0].png);
    return Rx.of(data.toString('base64'));
  }

  const output$ = Rx.from(screenshots).pipe(
    reduce((output: PNG, screenshot: Screenshot) => {
      // Spitting out a lot of output to help debug https://github.com/elastic/kibana/issues/19563. Once that is
      // fixed, this should probably get pared down.
      logger.debug(`Output dimensions is ${JSON.stringify(outputSize)}`);
      logger.debug(`Input png w: ${screenshot.png.width} and h: ${screenshot.png.height}`);
      logger.debug(`Creating output png with ${JSON.stringify(screenshot.rectangle)}`);
      const { rectangle } = screenshot;
      screenshot.png.bitblt(
        output,
        0,
        0,
        rectangle.width,
        rectangle.height,
        rectangle.x,
        rectangle.y
      );
      return output;
    }, new PNG({ width: outputSize.width, height: outputSize.height }))
  );

  return output$.pipe(
    tap(png => png.pack()),
    switchMap<PNG, Buffer>($streamToObservable),
    toArray(),
    map((chunks: Buffer[]) => Buffer.concat(chunks).toString('base64'))
  );
}
