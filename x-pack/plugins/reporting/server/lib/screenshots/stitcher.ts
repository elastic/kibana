/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Rx, { from, of } from 'rxjs';
import { map, mergeMap, switchMap } from 'rxjs/operators';
import { ElementPosition } from './observable';

type CaptureScreenshotFn = (position: ElementPosition) => Promise<Buffer>;
type HandleClipFn = (
  data: Buffer,
  clip: { x: number; y: number; width: number; height: number }
) => void;

interface ScreenshotStitcherConstructorOpts {
  outputClip: ElementPosition;
  max: number;
  zoom: number;
}

export class ScreenshotStitcher {
  private elementPosition: ElementPosition;
  private max: number;
  private zoom: number;

  constructor(opts: ScreenshotStitcherConstructorOpts) {
    this.elementPosition = opts.outputClip;
    this.zoom = opts.zoom;
    this.max = opts.max;
  }

  private getPositions$(): Rx.Observable<ElementPosition> {
    // We have to divide the max by the zoom because we want to be limiting the resolution
    // of the output screenshots, which is implicitly multiplied by the zoom, but we don't
    // want the zoom to affect the clipping rects that we use
    const clip = {
      ...this.elementPosition.boundingClientRect,
      ...this.elementPosition.scroll,
    };
    const max = Math.ceil(this.max / this.zoom);

    return from(
      (function* (): Generator<ElementPosition> {
        const columns = Math.ceil(clip.width / max);
        const rows = Math.ceil(clip.height / max);

        for (let row = 0; row < rows; ++row) {
          for (let column = 0; column < columns; ++column) {
            yield {
              boundingClientRect: {
                width: column === columns - 1 ? clip.width - column * max : max,
                height: row === rows - 1 ? clip.width - row * max : max,
              },
              scroll: {
                x: column * max + clip.x,
                y: row * max + clip.y,
              },
            };
          }
        }
      })()
    );
  }

  public async stream(capture: CaptureScreenshotFn, handler: HandleClipFn): Promise<void> {
    const screenshotClips$ = this.getPositions$();
    const screenshots$ = screenshotClips$.pipe(
      mergeMap(async (clip) => {
        const data = await capture(clip);
        return { clip, data };
      })
    );

    // when we take the screenshots we don't have to scale the rects
    // but the PNGs don't know about the zoom, so we have to scale them
    const screenshotPngDimensions$ = screenshots$.pipe(
      map(({ data, clip }) => ({
        data,
        scaledRect: scaleRect(
          {
            scroll: {
              x: clip.scroll.x - this.elementPosition.scroll.x,
              y: (clip.scroll.y = this.elementPosition.scroll.y),
            },
            boundingClientRect: {
              width: clip.boundingClientRect.width,
              height: clip.boundingClientRect.height,
            },
          },
          this.zoom
        ),
      }))
    );

    // FIXME: paused the thought process here
    return await screenshotPngDimensions$
      .pipe(switchMap((screenshots) => of(handler(screenshots.data, screenshots.scaledRect))))
      .toPromise();
  }
}

const scaleRect = (rect: ElementPosition, scale: number) => {
  return {
    x: rect.scroll.x * scale,
    y: rect.scroll.y * scale,
    width: rect.boundingClientRect.width * scale,
    height: rect.boundingClientRect.height * scale,
  };
};
