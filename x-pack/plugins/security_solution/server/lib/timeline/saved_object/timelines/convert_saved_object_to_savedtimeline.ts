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
  SavedObjectTimelineStatus,
} from '../../../../../common/types/timeline/saved_object';
import type { TimelineSavedObject } from '../../../../../common/api/timeline';
import {
  type TimelineType,
  TimelineTypeEnum,
  type TimelineStatus,
  TimelineStatusEnum,
} from '../../../../../common/api/timeline';

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

export const convertSavedObjectToSavedTimeline = (savedObject: unknown): TimelineSavedObject =>
  pipe(
    TimelineSavedObjectWithDraftRuntime.decode(savedObject),
    map((savedTimeline) => {
      const attributes = {
        columns: savedTimeline.attributes.columns,
        dataProviders: savedTimeline.attributes.dataProviders,
        dataViewId: savedTimeline.attributes.dataViewId,
        description: savedTimeline.attributes.description,
        eqlOptions: savedTimeline.attributes.eqlOptions,
        eventType: savedTimeline.attributes.eventType,
        excludedRowRendererIds: savedTimeline.attributes.excludedRowRendererIds,
        favorite: savedTimeline.attributes.favorite,
        filters: savedTimeline.attributes.filters,
        indexNames: savedTimeline.attributes.indexNames,
        kqlMode: savedTimeline.attributes.kqlMode,
        kqlQuery: savedTimeline.attributes.kqlQuery,
        title: savedTimeline.attributes.title,
        templateTimelineId: savedTimeline.attributes.templateTimelineId,
        templateTimelineVersion: savedTimeline.attributes.templateTimelineVersion,
        dateRange: savedTimeline.attributes.dateRange,
        savedQueryId: savedTimeline.attributes.savedQueryId,
        created: savedTimeline.attributes.created,
        createdBy: savedTimeline.attributes.createdBy,
        updated: savedTimeline.attributes.updated,
        updatedBy: savedTimeline.attributes.updatedBy,

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
        savedSearchId: savedTimeline.attributes.savedSearchId,
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
      return TimelineTypeEnum.template;
    case 'draft':
    default:
      return TimelineTypeEnum.default;
  }
}

function savedObjectTimelineStatusToAPITimelineStatus(
  timelineType: SavedObjectTimelineType | 'draft' | null,
  status: SavedObjectTimelineStatus | null
): TimelineStatus {
  // TODO: Added to support legacy TimelineType.draft, can be removed in 7.10
  if (timelineType === 'draft') {
    return TimelineStatusEnum.draft;
  }
  switch (status) {
    case SavedObjectTimelineStatus.draft:
      return TimelineStatusEnum.draft;
    case SavedObjectTimelineStatus.immutable:
      return TimelineStatusEnum.immutable;
    case SavedObjectTimelineStatus.active:
    default:
      return TimelineStatusEnum.active;
  }
}
