/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LevelLogger } from '../';
import { UrlOrUrlLocatorTuple } from '../../../common/types';
import { ConditionalHeaders } from '../../export_types/common';
import { LayoutInstance } from '../layouts';

export { getScreenshots$ } from './observable';

export interface PhaseInstance {
  timeoutValue: number;
  configValue: string;
  label: string;
}

export interface PhaseTimeouts {
  openUrl: PhaseInstance;
  waitForElements: PhaseInstance;
  renderComplete: PhaseInstance;
  loadDelay: number;
}

export interface ScreenshotObservableOpts {
  logger: LevelLogger;
  urlsOrUrlLocatorTuples: UrlOrUrlLocatorTuple[];
  conditionalHeaders: ConditionalHeaders;
  layout: LayoutInstance;
  browserTimezone?: string;
}

export interface AttributesMap {
  [key: string]: string | null;
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
  data: Buffer;
  title: string | null;
  description: string | null;
}

export interface PageSetupResults {
  elementsPositionAndAttributes: ElementsPositionAndAttribute[] | null;
  timeRange: string | null;
  error?: Error;
}

export interface ScreenshotResults {
  timeRange: string | null;
  screenshots: Screenshot[];
  error?: Error;

  /**
   * Individual visualizations might encounter errors at runtime. If there are any they are added to this
   * field. Any text captured here is intended to be shown to the user for debugging purposes, reporting
   * does no further sanitization on these strings.
   */
  renderErrors?: string[];
  elementsPositionAndAttributes?: ElementsPositionAndAttribute[]; // NOTE: for testing
}
