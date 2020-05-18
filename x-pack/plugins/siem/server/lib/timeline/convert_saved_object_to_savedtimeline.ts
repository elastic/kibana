/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { failure } from 'io-ts/lib/PathReporter';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import {
  TimelineSavedObjectRuntimeType,
  TimelineSavedObject,
  TimelineType,
  TimelineStatus,
} from '../../../common/types/timeline';

const getTimelineTypeAndStatus = (
  timelineType: TimelineType = TimelineType.default,
  status: TimelineStatus = TimelineStatus.active
): { timelineType: TimelineType; status: TimelineStatus } => {
  // TODO: Added to support legacy TimelineType.draft, can be removed in 7.10
  if (timelineType === 'draft') {
    return {
      timelineType: TimelineType.default,
      status: TimelineStatus.draft,
    };
  }

  return {
    timelineType,
    status,
  };
};

export const convertSavedObjectToSavedTimeline = (savedObject: unknown): TimelineSavedObject => {
  const timeline = pipe(
    TimelineSavedObjectRuntimeType.decode(savedObject),
    map(savedTimeline => {
      const attributes = {
        ...savedTimeline.attributes,
        ...getTimelineTypeAndStatus(
          savedTimeline.attributes.timelineType,
          savedTimeline.attributes.status
        ),
      };
      return {
        savedObjectId: savedTimeline.id,
        version: savedTimeline.version,
        ...attributes,
      };
    }),
    fold(errors => {
      throw new Error(failure(errors).join('\n'));
    }, identity)
  );

  return timeline;
};
