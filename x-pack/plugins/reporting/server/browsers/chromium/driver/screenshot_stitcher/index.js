/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { $getClips } from './get_clips';
import { $combine } from './combine';

const scaleRect = (rect, scale) => {
  return {
    x: rect.x * scale,
    y: rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
};

export async function screenshotStitcher(outputClip, zoom, max, captureScreenshotFn) {
  // We have to divide the max by the zoom because we want to be limiting the resolution
  // of the output screenshots, which is implicitly multiplied by the zoom, but we don't
  // want the zoom to affect the clipping rects that we use
  const screenshotClips$ = $getClips(outputClip, Math.ceil(max / zoom));

  const screenshots$ = screenshotClips$.mergeMap(
    clip => captureScreenshotFn(clip),
    (clip, data) => ({ clip, data }),
    1
  );

  // when we take the screenshots we don't have to scale the rects
  // but the PNGs don't know about the zoom, so we have to scale them
  const screenshotPngDimensions$ = screenshots$.map(
    ({ data, clip }) => ({
      data,
      dimensions: scaleRect({
        x: clip.x - outputClip.x,
        y: clip.y - outputClip.y,
        width: clip.width,
        height: clip.height,
      }, zoom)
    })
  );

  return screenshotPngDimensions$
    .toArray()
    .switchMap(screenshots => $combine(screenshots, scaleRect(outputClip, zoom)))
    .toPromise();
}