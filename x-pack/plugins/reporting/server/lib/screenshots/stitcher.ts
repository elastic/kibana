/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { ElementPosition } from './observable';

interface ScreenshotStitcherConstructorOpts {
  outputClip: ElementPosition;
  zoom: number;
}

export class ScreenshotStitcher {
  private elementPosition: ElementPosition;

  constructor(opts: ScreenshotStitcherConstructorOpts) {
    this.elementPosition = opts.outputClip;
  }

  public getClips$(): Rx.Observable<ElementPosition> {
    // We have to divide the max by the zoom because we want to be limiting the resolution
    // of the output screenshots, which is implicitly multiplied by the zoom, but we don't
    // want the zoom to affect the clipping rects that we use
    const position = this.elementPosition;

    return Rx.from(
      (function* (): Generator<ElementPosition> {
        // do magic here and chunk up the elementPosition
        yield position;
      })()
    );
  }
}
