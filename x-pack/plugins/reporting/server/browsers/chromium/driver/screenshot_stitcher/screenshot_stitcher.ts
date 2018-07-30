/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, mergeMap, switchMap, toArray } from 'rxjs/operators';
import { $combine } from './combine';
import { $getClips } from './get_clips';
import { Logger, Rectangle, Screenshot } from './types';

const scaleRect = (rect: Rectangle, scale: number): Rectangle => {
  return {
    height: rect.height * scale,
    width: rect.width * scale,
    x: rect.x * scale,
    y: rect.y * scale,
  };
};

/**
 * Returns a stream of data that should be of the size outputClip.width * zoom x outputClip.height * zoom
 * @param outputClip - The dimensions the final image should take.
 * @param zoom - Determines the resolution want the final screenshot to take.
 * @param maxDimensionPerClip - The maximimum dimension, in any direction (width or height) that we should allow per
 * screenshot clip. If zoom is 10 and maxDimensionPerClip is anything less than or
 * equal to 10, each clip taken, before  being zoomed in, should be no bigger than 1 x 1.
 * If zoom is 10 and maxDimensionPerClip is 20, then each clip taken before being zoomed in should be no bigger than 2 x 2.
 * @param captureScreenshotFn - a function to take a screenshot from the page using the dimensions given. The data
 * returned should have dimensions not of the clip passed in, but of the clip passed in multiplied by zoom.
 * @param logger
 */
export async function screenshotStitcher(
  outputClip: Rectangle,
  zoom: number,
  maxDimensionPerClip: number,
  captureScreenshotFn: (rect: Rectangle) => Promise<string>,
  logger: Logger
): Promise<string> {
  // We have to divide the max by the zoom because we will be multiplying each clip's dimensions
  // later by zoom, and we don't want those dimensions to end up larger than max.
  const maxDimensionBeforeZoom = Math.ceil(maxDimensionPerClip / zoom);
  const screenshotClips$ = $getClips(outputClip, maxDimensionBeforeZoom);

  const screenshots$ = screenshotClips$.pipe(
    mergeMap(clip => captureScreenshotFn(clip), (clip, data) => ({ clip, data }), 1)
  );

  // when we take the screenshots we don't have to scale the rects
  // but the PNGs don't know about the zoom, so we have to scale them
  const screenshotPngRects$ = screenshots$.pipe(
    map(({ data, clip }) => {
      // At this point we don't care about the offset - the screenshots have been taken.
      // We need to adjust the x & y values so they all are adjusted for the top-left most
      // clip being at 0, 0.
      const x = clip.x - outputClip.x;
      const y = clip.y - outputClip.y;

      const scaledScreenshotRects = scaleRect(
        {
          height: clip.height,
          width: clip.width,
          x,
          y,
        },
        zoom
      );
      return {
        data,
        rectangle: scaledScreenshotRects,
      };
    })
  );

  const scaledOutputRects = scaleRect(outputClip, zoom);
  return screenshotPngRects$
    .pipe(
      toArray(),
      switchMap<Screenshot[], string>((screenshots: Screenshot[]) =>
        $combine(
          screenshots,
          {
            height: scaledOutputRects.height,
            width: scaledOutputRects.width,
          },
          logger
        )
      )
    )
    .toPromise<string>();
}
