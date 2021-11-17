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
  zoom: number;
}

export class ScreenshotStitcher {
  private clip: ScreenshotClip;
  private rowPixelMax = 100;

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
        for (let row = 0; row < rows; ++row) {
          for (let column = 0; column < columns; ++column) {
            const dimensions = {
              x: column % 2 === 0 ? clip.x : clip.x + clip.width / 2, // alternate left and right row
              y: row * max + clip.y,
              width: clip.width / 2,
              height: row === rows - 1 ? clip.height - row * max : max,
            };
            console.log({ row, column });
            console.log(JSON.stringify({ dimensions }));

            yield dimensions;
          }
        }
      })()
    );
  }

  // FIXME add a combine$ method for downloading the rebuilt PNG
}
