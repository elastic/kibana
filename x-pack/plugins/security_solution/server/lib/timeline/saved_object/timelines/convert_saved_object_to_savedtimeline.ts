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
import type { SavedObjectTimeline } from '../../../../../common/types/timeline';
import {
  SavedObjectTimelineRuntimeType,
  SavedObjectTimelineTypeLiteralWithNullRt,
  SavedObjectTimelineType,
  TimelineStatus,
} from '../../../../../common/types/timeline';

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
  status: TimelineStatus | null = TimelineStatus.active
) => {
  // TODO: Added to support legacy TimelineType.draft, can be removed in 7.10
  if (timelineType === 'draft') {
    return {
      timelineType: SavedObjectTimelineType.default,
      status: TimelineStatus.draft,
    };
  }

  return {
    timelineType,
    status,
  };
};

export const convertSavedObjectToSavedTimeline = (savedObject: unknown): SavedObjectTimeline =>
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
