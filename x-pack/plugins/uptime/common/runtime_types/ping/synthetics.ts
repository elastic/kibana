/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/lib/Either';
import * as t from 'io-ts';

export const JourneyStepType = t.type({
  '@timestamp': t.string,
  monitor: t.type({
    check_group: t.string,
  }),
  synthetics: t.type({
    step: t.type({
      index: t.number,
      name: t.string,
    }),
    type: t.string,
  }),
});

export type JourneyStep = t.TypeOf<typeof JourneyStepType>;

export const FailedStepsApiResponseType = t.type({
  checkGroups: t.array(t.string),
  steps: t.array(JourneyStepType),
});

export type FailedStepsApiResponse = t.TypeOf<typeof FailedStepsApiResponseType>;

export const ScreenshotBlockType = t.type({
  hash: t.string,
  top: t.number,
  left: t.number,
  height: t.number,
  width: t.number,
});

export const ScreenshotType = t.type({
  synthetics: t.intersection([
    t.partial({
      blob: t.string,
    }),
    t.type({
      blob: t.string,
      blob_mime: t.string,
      step: t.type({
        name: t.string,
      }),
      type: t.literal('step/screenshot'),
    }),
  ]),
});

export type Screenshot = t.TypeOf<typeof ScreenshotType>;

export function isScreenshot(data: unknown): data is Screenshot {
  return isRight(ScreenshotType.decode(data));
}

export const RefResultType = t.type({
  '@timestamp': t.string,
  monitor: t.type({
    check_group: t.string,
  }),
  screenshot_ref: t.type({
    width: t.number,
    height: t.number,
    blocks: t.array(ScreenshotBlockType),
  }),
  synthetics: t.type({
    package_version: t.string,
    step: t.type({
      name: t.string,
      index: t.number,
    }),
    type: t.literal('step/screenshot_ref'),
  }),
});

export type RefResult = t.TypeOf<typeof RefResultType>;

export function isRef(data: unknown): data is RefResult {
  return isRight(RefResultType.decode(data));
}

export const ScreenshotImageBlobType = t.type({
  stepName: t.union([t.null, t.string]),
  maxSteps: t.number,
  src: t.string,
});

export type ScreenshotImageBlob = t.TypeOf<typeof ScreenshotImageBlobType>;

export function isScreenshotImageBlob(data: unknown): data is ScreenshotImageBlob {
  return isRight(ScreenshotImageBlobType.decode(data));
}

export const ScreenshotRefImageDataType = t.type({
  stepName: t.union([t.null, t.string]),
  maxSteps: t.number,
  ref: t.type({
    screenshotRef: RefResultType,
    blocks: t.array(
      t.type({
        id: t.string,
        synthetics: t.type({
          blob: t.string,
          blob_mime: t.string,
        }),
      })
    ),
  }),
});

export type ScreenshotRefImageData = t.TypeOf<typeof ScreenshotRefImageDataType>;

export function isScreenshotRef(data: unknown): data is ScreenshotRefImageData {
  return isRight(ScreenshotRefImageDataType.decode(data));
}
