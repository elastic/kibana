/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ImportTimelinesSchema } from '../schemas/import_timelines_schema';
import { TimelineSavedObject } from '../../../../../common/types/timeline';

export const getTimelinesToInstall = (
  timelinesFromFileSystem: ImportTimelinesSchema[],
  installedTimelines: TimelineSavedObject[]
): ImportTimelinesSchema[] => {
  return timelinesFromFileSystem.filter(
    (timeline) =>
      !installedTimelines.some(
        (installedTimeline) => installedTimeline.templateTimelineId === timeline.templateTimelineId
      )
  );
};
