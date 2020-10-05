/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { LevelLogger } from '../';
import { ConditionalHeaders } from '../../export_types/common';
import { LayoutInstance } from '../layouts';

export { screenshotsObservableFactory } from './observable';

export interface ScreenshotObservableOpts {
  logger: LevelLogger;
  urls: string[];
  conditionalHeaders: ConditionalHeaders;
  layout: LayoutInstance;
  browserTimezone?: string;
}

export interface AttributesMap {
  [key: string]: any;
}

export interface ElementPosition {
  boundingClientRect: {
    // modern browsers support x/y, but older ones don't
    top: number;
    left: number;
    width: number;
    height: number;
  };
  scroll: {
    x: number;
    y: number;
  };
}

export interface ElementsPositionAndAttribute {
  position: ElementPosition;
  attributes: AttributesMap;
}

export interface Screenshot {
  base64EncodedData: string;
  title: string;
  description: string;
}

export interface ScreenshotResults {
  timeRange: string | null;
  screenshots: Screenshot[];
  error?: Error;
  elementsPositionAndAttributes?: ElementsPositionAndAttribute[]; // NOTE: for testing
}

export type ScreenshotsObservableFn = ({
  logger,
  urls,
  conditionalHeaders,
  layout,
  browserTimezone,
}: ScreenshotObservableOpts) => Rx.Observable<ScreenshotResults[]>;
