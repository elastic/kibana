/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { intersection, type, partial, literal, union, string } from 'io-ts/lib/index';
import { failure } from 'io-ts/lib/PathReporter';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import {
  SavedTimelineRuntimeType,
  TimelineTypeLiteralWithNullRt,
  TimelineSavedObject,
  TimelineType,
  TimelineStatus,
} from '../../../common/types/timeline';

// TODO: Added to support legacy TimelineType.draft, can be removed in 7.10
export const TimelineSavedObjectWithDraftRuntimeType = intersection([
  type({
    id: string,
    version: string,
    attributes: partial({
      ...SavedTimelineRuntimeType.props,
      timelineType: union([TimelineTypeLiteralWithNullRt, literal('draft')]),
    }),
  }),
  partial({
    savedObjectId: string,
  }),
]);

const getTimelineTypeAndStatus = (
  timelineType: TimelineType | 'draft' | null = TimelineType.default,
  status: TimelineStatus | null = TimelineStatus.active
) => {
  // TODO: Added to support legacy TimelineType.draft, can be removed in 7.10
  // @ts-ignore
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
    TimelineSavedObjectWithDraftRuntimeType.decode(savedObject),
    map((savedTimeline) => {
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
    fold((errors) => {
      throw new Error(failure(errors).join('\n'));
    }, identity)
  );

  return timeline;
};
