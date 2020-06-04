/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest } from '../../../framework';
import { getTimelines as getSelectedTimelines } from '../../saved_object';
import { TimelineSavedObject } from '../../../../../common/types/timeline';

export const getTimelines = async (
  frameworkRequest: FrameworkRequest,
  ids: string[]
): Promise<{ timeline: TimelineSavedObject[] | null; error: string | null }> => {
  try {
    const timelines = await getSelectedTimelines(frameworkRequest, ids);
    const existingTimelineIds = timelines.timelines.map((timeline) => timeline.savedObjectId);
    const errorMsg = timelines.errors.reduce(
      (acc, curr) => (acc ? `${acc}, ${curr.message}` : curr.message),
      ''
    );
    if (existingTimelineIds.length > 0) {
      const message = existingTimelineIds.join(', ');
      return {
        timeline: timelines.timelines,
        error: errorMsg ? `${message} found, ${errorMsg}` : null,
      };
    } else {
      return { timeline: null, error: errorMsg };
    }
  } catch (e) {
    return e.message;
  }
};
