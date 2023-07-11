/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import Runner from '@elastic/synthetics/dist/core/runner';
import { after, Page } from '@elastic/synthetics';

const SYNTHETICS_RUNNER = Symbol.for('SYNTHETICS_RUNNER');

// @ts-ignore
export const runner: Runner = global[SYNTHETICS_RUNNER];

export const recordVideo = (page: Page, postfix = '') => {
  after(async () => {
    try {
      const videoFilePath = await page.video()?.path();
      const pathToVideo = videoFilePath
        ?.replace('.journeys/videos/', '')
        .replace('.webm', '');
      const newVideoPath = videoFilePath?.replace(
        pathToVideo!,
        postfix
          ? runner.currentJourney!.name + `-${postfix}`
          : runner.currentJourney!.name
      );
      fs.renameSync(videoFilePath!, newVideoPath!);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('Error while renaming video file', e);
    }
  });
};
