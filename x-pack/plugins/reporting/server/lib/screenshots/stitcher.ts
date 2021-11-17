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

  constructor(opts: ScreenshotStitcherConstructorOpts) {
    this.clip = opts.outputClip;
  }

  public getClips$(): Rx.Observable<ScreenshotClip> {
    const clip = this.clip;

    // Divide the output dimensions proportionally
    return Rx.from(
      (function* (): Generator<ScreenshotClip> {
        const { x, y, width, height } = clip;
        // AB
        // CD

        // A
        yield { x, y, width: width / 2, height: height / 2 };

        // B
        yield { x: x + width / 2, y, width: width / 2, height: height / 2 };

        // C
        yield { x, y: y + height / 2, width: width / 2, height: height / 2 };

        // D
        yield { x: x + width / 2, y: y + height / 2, width: width / 2, height: height / 2 };
      })()
    );
  }
}
