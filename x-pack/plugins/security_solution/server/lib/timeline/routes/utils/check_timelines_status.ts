/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import path, { join, resolve } from 'path';

import { TimelineSavedObject } from '../../../../../common/types/timeline';

import { FrameworkRequest } from '../../../framework';

import { getExistingPrepackagedTimelines } from '../../saved_object';

import { CheckTimelineStatusRt } from '../schemas/check_timelines_status_schema';

import { loadData, getReadables } from './common';
import { getTimelinesToInstall } from './get_timelines_to_install';
import { getTimelinesToUpdate } from './get_timelines_to_update';

export const checkTimelinesStatus = async (
  frameworkRequest: FrameworkRequest,
  filePath?: string,
  fileName?: string
): Promise<CheckTimelineStatusRt | Error> => {
  let readStream;
  let timeline: {
    totalCount: number;
    timeline: TimelineSavedObject[];
  };
  const dir = resolve(
    join(__dirname, filePath ?? '../../../detection_engine/rules/prepackaged_timelines')
  );
  const file = fileName ?? 'index.ndjson';
  const dataPath = path.join(dir, file);

  try {
    readStream = await getReadables(dataPath);
    timeline = await getExistingPrepackagedTimelines(frameworkRequest, false);
  } catch (err) {
    return {
      timelinesToInstall: [],
      timelinesToUpdate: [],
      prepackagedTimelines: [],
    };
  }

  return loadData<'utf-8', CheckTimelineStatusRt>(
    readStream,
    <T>(timelinesFromFileSystem: T) => {
      if (Array.isArray(timelinesFromFileSystem)) {
        const parsedTimelinesFromFileSystem = timelinesFromFileSystem.map((t: string) =>
          JSON.parse(t)
        );
        const prepackagedTimelines = timeline.timeline ?? [];
        const timelinesToInstall = getTimelinesToInstall(
          parsedTimelinesFromFileSystem,
          prepackagedTimelines
        );
        const timelinesToUpdate = getTimelinesToUpdate(
          parsedTimelinesFromFileSystem,
          prepackagedTimelines
        );

        return Promise.resolve({
          timelinesToInstall,
          timelinesToUpdate,
          prepackagedTimelines,
        });
      } else {
        return Promise.reject(new Error('load timeline error'));
      }
    },
    'utf-8'
  );
};
