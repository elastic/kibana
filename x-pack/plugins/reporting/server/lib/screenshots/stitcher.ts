/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { ScreenshotClip } from 'puppeteer';

interface ScreenshotStitcherConstructorOpts {
  outputClip: ScreenshotClip;
}

export class ScreenshotStitcher {
  private clip: ScreenshotClip;
  private rowPixelMax = 400; // ES payloads should be about 100k

  constructor(opts: ScreenshotStitcherConstructorOpts) {
    this.clip = opts.outputClip;
  }

  public getClips$(): Rx.Observable<ScreenshotClip> {
    const clip = this.clip;
    const max = this.rowPixelMax;

    /*
     * Divide the output dimensions proportionally
     * 2 columns hardcoded to make re-arrangement easier when downloading
     * N rows, based on the height
     *
     * AB
     * CD
     * ...
     */

    const columns = 2;
    const rows = Math.ceil(clip.height / this.rowPixelMax);

    return Rx.from(
      (function* (): Generator<ScreenshotClip> {
        let y = 0;
        const x = clip.x;
        const halfW = Math.ceil(clip.width / 2);

        for (let row = 0; row < rows; ++row) {
          const rowHeight = row === rows - 1 ? clip.height - row * max : max;
          y = row * max + clip.y;
          for (let clipId = 0; clipId < columns; ++clipId) {
            yield {
              y,
              x: clipId % 2 === 0 ? x : x + halfW, // left side or right side
              width: halfW,
              height: rowHeight,
            };
          }
        }
      })()
    );
  }

  // FIXME add a combine$ method for downloading the rebuilt PNG
}
