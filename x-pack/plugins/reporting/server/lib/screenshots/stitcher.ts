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
    const outputClip = opts.outputClip;
    this.clip = outputClip;
  }

  public getClips$(): Rx.Observable<ScreenshotClip> {
    const outputClip = this.clip;
    const max = this.rowPixelMax;

    const columns = 2;
    const rows = Math.ceil(outputClip.height / this.rowPixelMax);

    return Rx.from(
      (function* (): Generator<ScreenshotClip> {
        let y = 0;
        const x = outputClip.x;
        const halfW = Math.ceil(outputClip.width / 2);

        for (let row = 0; row < rows; ++row) {
          const rowHeight = row === rows - 1 ? outputClip.height - row * max : max;
          y = row * max + outputClip.y;
          for (let clipId = 0; clipId < columns; ++clipId) {
            const clip = {
              y,
              x: clipId % 2 === 0 ? x : x + halfW, // left side or right side
              width: halfW,
              height: rowHeight,
            };
            yield clip;
          }
        }
      })()
    );
  }

  // FIXME add a combine$ method for downloading the rebuilt PNG
}
