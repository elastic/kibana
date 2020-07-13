/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { SavedObjectsFindOptions } from '../../../../../../src/core/server';
import { UNAUTHENTICATED_USER, enableElasticFilter } from '../../../common/constants';
import { NoteSavedObject } from '../../../common/types/timeline/note';
import { PinnedEventSavedObject } from '../../../common/types/timeline/pinned_event';
import {
  SavedTimeline,
  TimelineSavedObject,
  TimelineTypeLiteralWithNull,
  ExportTimelineNotFoundError,
  TimelineStatusLiteralWithNull,
  TemplateTimelineTypeLiteralWithNull,
  TemplateTimelineType,
} from '../../../common/types/timeline';
import {
  ResponseTimeline,
  PageInfoTimeline,
  SortTimeline,
  ResponseFavoriteTimeline,
  TimelineResult,
  TimelineType,
  TimelineStatus,
  Maybe,
} from '../../graphql/types';
import { FrameworkRequest } from '../framework';
import * as note from '../note/saved_object';
import * as pinnedEvent from '../pinned_event/saved_object';
import { convertSavedObjectToSavedTimeline } from './convert_saved_object_to_savedtimeline';
import { pickSavedTimeline } from './pick_saved_timeline';
import { timelineSavedObjectType } from './saved_object_mappings';
import { draftTimelineDefaults } from './default_timeline';
import { AuthenticatedUser } from '../../../../security/server';

interface ResponseTimelines {
  timeline: TimelineSavedObject[];
  totalCount: number;
}

interface AllTimelinesResponse extends ResponseTimelines {
  defaultTimelineCount: number;
  templateTimelineCount: number;
  elasticTemplateTimelineCount: number;
  customTemplateTimelineCount: number;
  favoriteCount: number;
}

export interface ResponseTemplateTimeline {
  code?: Maybe<number>;

  message?: Maybe<string>;

  templateTimeline: TimelineResult;
}

export interface Timeline {
  getTimeline: (request: FrameworkRequest, timelineId: string) => Promise<TimelineSavedObject>;

  getAllTimeline: (
    request: FrameworkRequest,
    onlyUserFavorite: boolean | null,
    pageInfo: PageInfoTimeline | null,
    search: string | null,
    sort: SortTimeline | null,
    status: TimelineStatusLiteralWithNull,
    timelineType: TimelineTypeLiteralWithNull,
    templateTimelineType: TemplateTimelineTypeLiteralWithNull
  ) => Promise<AllTimelinesResponse>;

  persistFavorite: (
    request: FrameworkRequest,
    timelineId: string | null
  ) => Promise<ResponseFavoriteTimeline>;

  persistTimeline: (
    request: FrameworkRequest,
    timelineId: string | null,
    version: string | null,
    timeline: SavedTimeline,
    isImmutable?: boolean
  ) => Promise<ResponseTimeline>;

  deleteTimeline: (request: FrameworkRequest, timelineIds: string[]) => Promise<void>;
  convertStringToBase64: (text: string) => string;
  timelineWithReduxProperties: (
    notes: NoteSavedObject[],
    pinnedEvents: PinnedEventSavedObject[],
    timeline: TimelineSavedObject,
    userName: string
  ) => TimelineSavedObject;
}

export const getTimeline = async (
  request: FrameworkRequest,
  timelineId: string
): Promise<TimelineSavedObject> => {
  return getSavedTimeline(request, timelineId);
};

export const getTimelineByTemplateTimelineId = async (
  request: FrameworkRequest,
  templateTimelineId: string
): Promise<{
  totalCount: number;
  timeline: TimelineSavedObject[];
}> => {
  const options: SavedObjectsFindOptions = {
    type: timelineSavedObjectType,
    filter: `siem-ui-timeline.attributes.templateTimelineId: "${templateTimelineId}"`,
  };
  return getAllSavedTimeline(request, options);
};

/** The filter here is able to handle the legacy data,
 * which has no timelineType exists in the savedObject */
const getTimelineTypeFilter = (
  timelineType: TimelineTypeLiteralWithNull,
  templateTimelineType: TemplateTimelineTypeLiteralWithNull,
  status: TimelineStatusLiteralWithNull
) => {
  const typeFilter =
    timelineType == null
      ? null
      : timelineType === TimelineType.template
      ? `siem-ui-timeline.attributes.timelineType: ${TimelineType.template}` /** Show only whose timelineType exists and equals to "template" */
      : /** Show me every timeline whose timelineType is not "template".
         * which includes timelineType === 'default' and
         * those timelineType doesn't exists */
        `not siem-ui-timeline.attributes.timelineType: ${TimelineType.template}`;

  /** Show me every timeline whose status is not "draft".
   * which includes status === 'active' and
   * those status doesn't exists */
  const draftFilter =
    status === TimelineStatus.draft
      ? `siem-ui-timeline.attributes.status: ${TimelineStatus.draft}`
      : `not siem-ui-timeline.attributes.status: ${TimelineStatus.draft}`;

  const immutableFilter =
    status == null
      ? null
      : status === TimelineStatus.immutable
      ? `siem-ui-timeline.attributes.status: ${TimelineStatus.immutable}`
      : `not siem-ui-timeline.attributes.status: ${TimelineStatus.immutable}`;

  const templateTimelineTypeFilter =
    templateTimelineType == null
      ? null
      : templateTimelineType === TemplateTimelineType.elastic
      ? `siem-ui-timeline.attributes.createdBy: "Elsatic"`
      : `not siem-ui-timeline.attributes.createdBy: "Elastic"`;

  const filters = enableElasticFilter
    ? [typeFilter, draftFilter, immutableFilter, templateTimelineTypeFilter]
    : [typeFilter, draftFilter, immutableFilter];
  return filters.filter((f) => f != null).join(' and ');
};

export const getExistingPrepackagedTimelines = async (
  request: FrameworkRequest,
  countsOnly?: boolean,
  pageInfo?: PageInfoTimeline | null
): Promise<{
  totalCount: number;
  timeline: TimelineSavedObject[];
}> => {
  const queryPageInfo = countsOnly
    ? {
        perPage: 1,
        page: 1,
      }
    : pageInfo ?? {};
  const elasticTemplateTimelineOptions = {
    type: timelineSavedObjectType,
    ...queryPageInfo,
    filter: getTimelineTypeFilter(
      TimelineType.template,
      TemplateTimelineType.elastic,
      TimelineStatus.immutable
    ),
  };

  return getAllSavedTimeline(request, elasticTemplateTimelineOptions);
};

export const getAllTimeline = async (
  request: FrameworkRequest,
  onlyUserFavorite: boolean | null,
  pageInfo: PageInfoTimeline | null,
  search: string | null,
  sort: SortTimeline | null,
  status: TimelineStatusLiteralWithNull,
  timelineType: TimelineTypeLiteralWithNull,
  templateTimelineType: TemplateTimelineTypeLiteralWithNull
): Promise<AllTimelinesResponse> => {
  const options: SavedObjectsFindOptions = {
    type: timelineSavedObjectType,
    perPage: pageInfo?.pageSize ?? undefined,
    page: pageInfo?.pageIndex ?? undefined,
    search: search != null ? search : undefined,
    searchFields: onlyUserFavorite
      ? ['title', 'description', 'favorite.keySearch']
      : ['title', 'description'],
    filter: getTimelineTypeFilter(timelineType, templateTimelineType, status),
    sortField: sort != null ? sort.sortField : undefined,
    sortOrder: sort != null ? sort.sortOrder : undefined,
  };

  const timelineOptions = {
    type: timelineSavedObjectType,
    perPage: 1,
    page: 1,
    filter: getTimelineTypeFilter(TimelineType.default, null, TimelineStatus.active),
  };

  const templateTimelineOptions = {
    type: timelineSavedObjectType,
    perPage: 1,
    page: 1,
    filter: getTimelineTypeFilter(TimelineType.template, null, null),
  };

  const customTemplateTimelineOptions = {
    type: timelineSavedObjectType,
    perPage: 1,
    page: 1,
    filter: getTimelineTypeFilter(
      TimelineType.template,
      TemplateTimelineType.custom,
      TimelineStatus.active
    ),
  };

  const favoriteTimelineOptions = {
    type: timelineSavedObjectType,
    searchFields: ['title', 'description', 'favorite.keySearch'],
    perPage: 1,
    page: 1,
    filter: getTimelineTypeFilter(timelineType, null, TimelineStatus.active),
  };

  const result = await Promise.all([
    getAllSavedTimeline(request, options),
    getAllSavedTimeline(request, timelineOptions),
    getAllSavedTimeline(request, templateTimelineOptions),
    getExistingPrepackagedTimelines(request, true),
    getAllSavedTimeline(request, customTemplateTimelineOptions),
    getAllSavedTimeline(request, favoriteTimelineOptions),
  ]);

  return Promise.resolve({
    ...result[0],
    defaultTimelineCount: result[1].totalCount,
    templateTimelineCount: result[2].totalCount,
    elasticTemplateTimelineCount: result[3].totalCount,
    customTemplateTimelineCount: result[4].totalCount,
    favoriteCount: result[5].totalCount,
  });
};

export const getDraftTimeline = async (
  request: FrameworkRequest,
  timelineType: TimelineTypeLiteralWithNull
): Promise<ResponseTimelines> => {
  const options: SavedObjectsFindOptions = {
    type: timelineSavedObjectType,
    perPage: 1,
    filter: getTimelineTypeFilter(
      timelineType,
      timelineType === TimelineType.template ? TemplateTimelineType.custom : null,
      TimelineStatus.draft
    ),
    sortField: 'created',
    sortOrder: 'desc',
  };
  return getAllSavedTimeline(request, options);
};

export const persistFavorite = async (
  request: FrameworkRequest,
  timelineId: string | null
): Promise<ResponseFavoriteTimeline> => {
  const userName = request.user?.username ?? UNAUTHENTICATED_USER;
  const fullName = request.user?.full_name ?? '';
  try {
    let timeline: SavedTimeline = {};
    if (timelineId != null) {
      const {
        eventIdToNoteIds,
        notes,
        noteIds,
        pinnedEventIds,
        pinnedEventsSaveObject,
        savedObjectId,
        version,
        ...savedTimeline
      } = await getBasicSavedTimeline(request, timelineId);
      timelineId = savedObjectId; // eslint-disable-line no-param-reassign
      timeline = savedTimeline;
    }

    const userFavoriteTimeline = {
      keySearch: userName != null ? convertStringToBase64(userName) : null,
      favoriteDate: new Date().valueOf(),
      fullName,
      userName,
    };
    if (timeline.favorite != null) {
      const alreadyExistsTimelineFavoriteByUser = timeline.favorite.findIndex(
        (user) => user.userName === userName
      );

      timeline.favorite =
        alreadyExistsTimelineFavoriteByUser > -1
          ? [
              ...timeline.favorite.slice(0, alreadyExistsTimelineFavoriteByUser),
              ...timeline.favorite.slice(alreadyExistsTimelineFavoriteByUser + 1),
            ]
          : [...timeline.favorite, userFavoriteTimeline];
    } else if (timeline.favorite == null) {
      timeline.favorite = [userFavoriteTimeline];
    }

    const persistResponse = await persistTimeline(request, timelineId, null, timeline);
    return {
      savedObjectId: persistResponse.timeline.savedObjectId,
      version: persistResponse.timeline.version,
      favorite:
        persistResponse.timeline.favorite != null
          ? persistResponse.timeline.favorite.filter((fav) => fav.userName === userName)
          : [],
    };
  } catch (err) {
    if (getOr(null, 'output.statusCode', err) === 403) {
      return {
        savedObjectId: '',
        version: '',
        favorite: [],
        code: 403,
        message: err.message,
      };
    }
    throw err;
  }
};

export const persistTimeline = async (
  request: FrameworkRequest,
  timelineId: string | null,
  version: string | null,
  timeline: SavedTimeline,
  isImmutable?: boolean
): Promise<ResponseTimeline> => {
  const savedObjectsClient = request.context.core.savedObjects.client;
  const userInfo = isImmutable ? ({ username: 'Elastic' } as AuthenticatedUser) : request.user;
  try {
    if (timelineId == null) {
      // Create new timeline
      const newTimeline = convertSavedObjectToSavedTimeline(
        await savedObjectsClient.create(
          timelineSavedObjectType,
          pickSavedTimeline(timelineId, timeline, userInfo)
        )
      );
      return {
        code: 200,
        message: 'success',
        timeline: newTimeline,
      };
    }
    // Update Timeline
    await savedObjectsClient.update(
      timelineSavedObjectType,
      timelineId,
      pickSavedTimeline(timelineId, timeline, userInfo),
      {
        version: version || undefined,
      }
    );

    return {
      code: 200,
      message: 'success',
      timeline: await getSavedTimeline(request, timelineId),
    };
  } catch (err) {
    if (timelineId != null && savedObjectsClient.errors.isConflictError(err)) {
      return {
        code: 409,
        message: err.message,
        timeline: await getSavedTimeline(request, timelineId),
      };
    } else if (getOr(null, 'output.statusCode', err) === 403) {
      const timelineToReturn: TimelineResult = {
        ...timeline,
        savedObjectId: '',
        version: '',
      };
      return {
        code: 403,
        message: err.message,
        timeline: timelineToReturn,
      };
    }
    throw err;
  }
};

const updatePartialSavedTimeline = async (
  request: FrameworkRequest,
  timelineId: string,
  timeline: SavedTimeline
) => {
  const savedObjectsClient = request.context.core.savedObjects.client;
  const currentSavedTimeline = await savedObjectsClient.get<SavedTimeline>(
    timelineSavedObjectType,
    timelineId
  );

  return savedObjectsClient.update(
    timelineSavedObjectType,
    timelineId,
    pickSavedTimeline(
      null,
      {
        ...timeline,
        dateRange: currentSavedTimeline.attributes.dateRange,
      },
      request.user
    )
  );
};

export const resetTimeline = async (
  request: FrameworkRequest,
  timelineIds: string[],
  timelineType: TimelineType
) => {
  if (!timelineIds.length) {
    return Promise.reject(new Error('timelineIds is empty'));
  }

  await Promise.all(
    timelineIds.map((timelineId) =>
      Promise.all([
        note.deleteNoteByTimelineId(request, timelineId),
        pinnedEvent.deleteAllPinnedEventsOnTimeline(request, timelineId),
      ])
    )
  );

  const response = await Promise.all(
    timelineIds.map((timelineId) =>
      updatePartialSavedTimeline(request, timelineId, { ...draftTimelineDefaults, timelineType })
    )
  );

  return response;
};

export const deleteTimeline = async (request: FrameworkRequest, timelineIds: string[]) => {
  const savedObjectsClient = request.context.core.savedObjects.client;

  await Promise.all(
    timelineIds.map((timelineId) =>
      Promise.all([
        savedObjectsClient.delete(timelineSavedObjectType, timelineId),
        note.deleteNoteByTimelineId(request, timelineId),
        pinnedEvent.deleteAllPinnedEventsOnTimeline(request, timelineId),
      ])
    )
  );
};

const getBasicSavedTimeline = async (request: FrameworkRequest, timelineId: string) => {
  const savedObjectsClient = request.context.core.savedObjects.client;
  const savedObject = await savedObjectsClient.get(timelineSavedObjectType, timelineId);

  return convertSavedObjectToSavedTimeline(savedObject);
};

const getSavedTimeline = async (request: FrameworkRequest, timelineId: string) => {
  const userName = request.user?.username ?? UNAUTHENTICATED_USER;

  const savedObjectsClient = request.context.core.savedObjects.client;
  const savedObject = await savedObjectsClient.get(timelineSavedObjectType, timelineId);
  const timelineSaveObject = convertSavedObjectToSavedTimeline(savedObject);
  const timelineWithNotesAndPinnedEvents = await Promise.all([
    note.getNotesByTimelineId(request, timelineSaveObject.savedObjectId),
    pinnedEvent.getAllPinnedEventsByTimelineId(request, timelineSaveObject.savedObjectId),
    Promise.resolve(timelineSaveObject),
  ]);

  const [notes, pinnedEvents, timeline] = timelineWithNotesAndPinnedEvents;

  return timelineWithReduxProperties(notes, pinnedEvents, timeline, userName);
};

const getAllSavedTimeline = async (request: FrameworkRequest, options: SavedObjectsFindOptions) => {
  const userName = request.user?.username ?? UNAUTHENTICATED_USER;
  const savedObjectsClient = request.context.core.savedObjects.client;
  if (options.searchFields != null && options.searchFields.includes('favorite.keySearch')) {
    options.search = `${options.search != null ? options.search : ''} ${
      userName != null ? convertStringToBase64(userName) : null
    }`;
  }

  const savedObjects = await savedObjectsClient.find(options);
  const timelinesWithNotesAndPinnedEvents = await Promise.all(
    savedObjects.saved_objects.map(async (savedObject) => {
      const timelineSaveObject = convertSavedObjectToSavedTimeline(savedObject);
      return Promise.all([
        note.getNotesByTimelineId(request, timelineSaveObject.savedObjectId),
        pinnedEvent.getAllPinnedEventsByTimelineId(request, timelineSaveObject.savedObjectId),
        Promise.resolve(timelineSaveObject),
      ]);
    })
  );

  return {
    totalCount: savedObjects.total,
    timeline: timelinesWithNotesAndPinnedEvents.map(([notes, pinnedEvents, timeline]) =>
      timelineWithReduxProperties(notes, pinnedEvents, timeline, userName)
    ),
  };
};

export const convertStringToBase64 = (text: string): string => Buffer.from(text).toString('base64');

// we have to use any here because the SavedObjectAttributes interface is like below
// export interface SavedObjectAttributes {
//   [key: string]: SavedObjectAttributes | string | number | boolean | null;
// }
// then this interface does not allow types without index signature
// this is limiting us with our type for now so the easy way was to use any

export const timelineWithReduxProperties = (
  notes: NoteSavedObject[],
  pinnedEvents: PinnedEventSavedObject[],
  timeline: TimelineSavedObject,
  userName: string
): TimelineSavedObject => ({
  ...timeline,
  favorite:
    timeline.favorite != null && userName != null
      ? timeline.favorite.filter((fav) => fav.userName === userName)
      : [],
  eventIdToNoteIds: notes.filter((n) => n.eventId != null),
  noteIds: notes.filter((n) => n.eventId == null && n.noteId != null).map((n) => n.noteId),
  notes,
  pinnedEventIds: pinnedEvents.map((e) => e.eventId),
  pinnedEventsSaveObject: pinnedEvents,
});

export const getTimelines = async (request: FrameworkRequest, timelineIds?: string[] | null) => {
  const savedObjectsClient = request.context.core.savedObjects.client;
  let exportedIds = timelineIds;
  if (timelineIds == null || timelineIds.length === 0) {
    const { timeline: savedAllTimelines } = await getAllTimeline(
      request,
      false,
      null,
      null,
      null,
      TimelineStatus.active,
      null,
      null
    );
    exportedIds = savedAllTimelines.map((t) => t.savedObjectId);
  }

  const savedObjects = await Promise.resolve(
    savedObjectsClient.bulkGet(
      exportedIds?.reduce(
        (acc, timelineId) => [...acc, { id: timelineId, type: timelineSavedObjectType }],
        [] as Array<{ id: string; type: string }>
      )
    )
  );

  const timelineObjects: {
    timelines: TimelineSavedObject[];
    errors: ExportTimelineNotFoundError[];
  } = savedObjects.saved_objects.reduce(
    (acc, savedObject) => {
      return savedObject.error == null
        ? {
            errors: acc.errors,
            timelines: [...acc.timelines, convertSavedObjectToSavedTimeline(savedObject)],
          }
        : { errors: [...acc.errors, savedObject.error], timelines: acc.timelines };
    },
    {
      timelines: [] as TimelineSavedObject[],
      errors: [] as ExportTimelineNotFoundError[],
    }
  );

  return timelineObjects;
};
