/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const ScreenshotBlockType = t.type({
  hash: t.string,
  top: t.number,
  left: t.number,
  height: t.number,
  width: t.number,
});

export const KeyRefFields = t.type({
  width: t.number,
  height: t.number,
  blocks: t.array(ScreenshotBlockType),
});

export const RefResultType = t.type({
  '@timestamp': t.string,
  monitor: t.type({
    check_group: t.string,
  }),
  screenshot_ref: KeyRefFields,
  synthetics: t.type({
    package_version: t.string,
    step: t.type({
      name: t.string,
      index: t.number,
    }),
    type: t.string,
  }),
});

export type RefResult = t.TypeOf<typeof RefResultType>;

export const ScreenshotRefType = t.type({
  blob_mime: t.string,
  check_group: t.string,
  step: t.type({
    name: t.string,
    index: t.number,
  }),
  blocks: t.array(ScreenshotBlockType),
});

export type ScreenshotRef = Omit<t.TypeOf<typeof RefResultType>, '@timestamp'> & {
  timestamp: string;
};

const ScreenshotBlockBlob = t.type({
  synthetics: t.type({
    blob: t.string,
    blob_mime: t.string,
    index: t.number,
    package_version: t.string,
    type: t.string,
  }),
});

export const ScreenshotRefImageDataType = t.type({
  stepName: t.union([t.null, t.string]),
  maxSteps: t.number,
  ref: t.type({
    screenshotRef: RefResultType,
    blocks: t.array(ScreenshotBlockBlob),
  }),
});

export type ScreenshotRefImageData = t.TypeOf<typeof ScreenshotRefImageDataType>;
