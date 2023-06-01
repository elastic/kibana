/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { intersection, type, partial, literal, union, string } from 'io-ts/lib/index';
import { failure } from 'io-ts/lib/PathReporter';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import {
  SavedObjectTimelineRuntimeType,
  SavedObjectTimelineTypeLiteralWithNullRt,
  SavedObjectTimelineType,
  TimelineStatus as SavedObjectTimelineStatus,
} from '../../../../../common/types/timeline';
import type { TimelineSavedToReturnObjectRuntimeType } from '../../../../../common/types/timeline/api';
import { TimelineType, TimelineStatus } from '../../../../../common/types/timeline/api';

// TODO: Added to support legacy TimelineType.draft, can be removed in 7.10
const TimelineSavedObjectWithDraftRuntime = intersection([
  type({
    id: string,
    version: string,
    attributes: partial({
      ...SavedObjectTimelineRuntimeType.props,
      timelineType: union([SavedObjectTimelineTypeLiteralWithNullRt, literal('draft')]),
    }),
  }),
  partial({
    savedObjectId: string,
  }),
]);

const getTimelineTypeAndStatus = (
  timelineType: SavedObjectTimelineType | 'draft' | null = SavedObjectTimelineType.default,
  status: SavedObjectTimelineStatus | null = SavedObjectTimelineStatus.active
) => {
  return {
    timelineType: savedObjectTimelineTypeToAPITimelineType(timelineType),
    status: savedObjectTimelineStatusToAPITimelineStatus(timelineType, status),
  };
};

export const convertSavedObjectToSavedTimeline = (
  savedObject: unknown
): TimelineSavedToReturnObjectRuntimeType =>
  pipe(
    TimelineSavedObjectWithDraftRuntime.decode(savedObject),
    map((savedTimeline) => {
      const attributes = {
        ...savedTimeline.attributes,
        ...getTimelineTypeAndStatus(
          savedTimeline.attributes.timelineType,
          savedTimeline.attributes.status
        ),
        sort:
          savedTimeline.attributes.sort != null
            ? Array.isArray(savedTimeline.attributes.sort)
              ? savedTimeline.attributes.sort
              : [savedTimeline.attributes.sort]
            : [],
      };

      return {
        savedObjectId: savedTimeline.id,
        version: savedTimeline.version,
        ...attributes,
      };
    }),
    fold((errors) => {
      throw new Error(failure(errors).join('\n'));
    }, identity)
  );

function savedObjectTimelineTypeToAPITimelineType(
  timelineType: SavedObjectTimelineType | 'draft' | null
): TimelineType {
  switch (timelineType) {
    case SavedObjectTimelineType.template:
      return TimelineType.template;
    case 'draft':
    default:
      return TimelineType.default;
  }
}

function savedObjectTimelineStatusToAPITimelineStatus(
  timelineType: SavedObjectTimelineType | 'draft' | null,
  status: SavedObjectTimelineStatus | null
): TimelineStatus {
  // TODO: Added to support legacy TimelineType.draft, can be removed in 7.10
  if (timelineType === 'draft') {
    return TimelineStatus.draft;
  }
  switch (status) {
    case SavedObjectTimelineStatus.draft:
      return TimelineStatus.draft;
    case SavedObjectTimelineStatus.immutable:
      return TimelineStatus.immutable;
    case SavedObjectTimelineStatus.active:
    default:
      return TimelineStatus.active;
  }
}
