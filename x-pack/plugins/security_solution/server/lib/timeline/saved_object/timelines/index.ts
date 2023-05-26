/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import {
  type SavedObjectsClientContract,
  type SavedObjectsFindOptions,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/security-plugin/server';

import { UNAUTHENTICATED_USER } from '../../../../../common/constants';
import type { NoteSavedObject } from '../../../../../common/types/timeline/note';
import type { PinnedEventSavedObject } from '../../../../../common/types/timeline/pinned_event';
import type {
  AllTimelinesResponse,
  ExportTimelineNotFoundError,
  PageInfoTimeline,
  ResponseTimelines,
  ResponseFavoriteTimeline,
  ResponseTimeline,
  SavedTimeline,
  SortTimeline,
  TimelineSavedObjectRuntimeResponseType,
  TimelineTypeLiteralWithNull,
  TimelineStatusLiteralWithNull,
  TimelineResult,
  TimelineWithoutExternalRefs,
  ResolvedTimelineWithOutcomeSavedObjectResponse,
} from '../../../../../common/types/timeline';
import { TimelineType, TimelineStatus } from '../../../../../common/types/timeline';
import type { FrameworkRequest } from '../../../framework';
import * as note from '../notes/saved_object';
import * as pinnedEvent from '../pinned_events';
import { convertSavedObjectToSavedTimeline } from './convert_saved_object_to_savedtimeline';
import { pickSavedTimeline } from './pick_saved_timeline';
import { timelineSavedObjectType } from '../../saved_object_mappings';
import { draftTimelineDefaults } from '../../utils/default_timeline';
import { timelineFieldsMigrator } from './field_migrator';

export { pickSavedTimeline } from './pick_saved_timeline';
export { convertSavedObjectToSavedTimeline } from './convert_saved_object_to_savedtimeline';

export const getTimeline = async (
  request: FrameworkRequest,
  timelineId: string,
  timelineType: TimelineTypeLiteralWithNull = TimelineType.default
): Promise<TimelineSavedObjectRuntimeResponseType> => {
  let timelineIdToUse = timelineId;
  try {
    if (timelineType === TimelineType.template) {
      const options = {
        type: timelineSavedObjectType,
        perPage: 1,
        page: 1,
        filter: `siem-ui-timeline.attributes.templateTimelineId: ${timelineId}`,
      };
      const result = await getAllSavedTimeline(request, options);
      if (result.totalCount === 1) {
        timelineIdToUse = result.timeline[0].savedObjectId;
      }
    }
  } catch {
    // TO DO, we need to bring the logger here
  }
  return getSavedTimeline(request, timelineIdToUse);
};

export const getTimelineOrNull = async (
  frameworkRequest: FrameworkRequest,
  savedObjectId: string
): Promise<TimelineSavedObjectRuntimeResponseType | null> => {
  let timeline = null;
  try {
    timeline = await getTimeline(frameworkRequest, savedObjectId);
    // eslint-disable-next-line no-empty
  } catch (e) {}
  return timeline;
};

export const resolveTimelineOrNull = async (
  frameworkRequest: FrameworkRequest,
  savedObjectId: string
): Promise<ResolvedTimelineWithOutcomeSavedObjectResponse | null> => {
  try {
    const resolvedSavedTimeline = await resolveSavedTimeline(frameworkRequest, savedObjectId);

    const response: ResolvedTimelineWithOutcomeSavedObjectResponse = {
      alias_purpose: resolvedSavedTimeline.alias_purpose,
      alias_target_id: resolvedSavedTimeline.alias_target_id,
      outcome: resolvedSavedTimeline.outcome,
      timeline: {
        columns: resolvedSavedTimeline.timeline.columns,
        dataProviders: resolvedSavedTimeline.timeline.dataProviders,
        dataViewId: resolvedSavedTimeline.timeline.dataViewId,
        description: resolvedSavedTimeline.timeline.description,
        eqlOptions: resolvedSavedTimeline.timeline.eqlOptions,
        eventType: resolvedSavedTimeline.timeline.eventType,
        excludedRowRendererIds: resolvedSavedTimeline.timeline.excludedRowRendererIds,
        favorite: resolvedSavedTimeline.timeline.favorite,
        filters: resolvedSavedTimeline.timeline.filters,
        indexNames: resolvedSavedTimeline.timeline.indexNames,
        kqlMode: resolvedSavedTimeline.timeline.kqlMode,
        kqlQuery: resolvedSavedTimeline.timeline.kqlQuery,
        title: resolvedSavedTimeline.timeline.title,
        templateTimelineId: resolvedSavedTimeline.timeline.templateTimelineId,
        templateTimelineVersion: resolvedSavedTimeline.timeline.templateTimelineVersion,
        timelineType: resolvedSavedTimeline.timeline.timelineType,
        dateRange: resolvedSavedTimeline.timeline.dateRange,
        savedQueryId: resolvedSavedTimeline.timeline.savedQueryId,
        sort: resolvedSavedTimeline.timeline.sort,
        status: resolvedSavedTimeline.timeline.status,
        created: resolvedSavedTimeline.timeline.created,
        createdBy: resolvedSavedTimeline.timeline.createdBy,
        updated: resolvedSavedTimeline.timeline.updated,
        updatedBy: resolvedSavedTimeline.timeline.updatedBy,
        savedObjectId: resolvedSavedTimeline.timeline.savedObjectId,
        version: resolvedSavedTimeline.timeline.version,
        eventIdToNoteIds: resolvedSavedTimeline.timeline.eventIdToNoteIds,
        noteIds: resolvedSavedTimeline.timeline.noteIds,
        notes: resolvedSavedTimeline.timeline.notes,
        pinnedEventIds: resolvedSavedTimeline.timeline.pinnedEventIds,
        pinnedEventsSaveObject: resolvedSavedTimeline.timeline.pinnedEventsSaveObject,
      },
    };

    return response;
  } catch (e) {
    return null;
  }
};

export const getTimelineByTemplateTimelineId = async (
  request: FrameworkRequest,
  templateTimelineId: string
): Promise<{
  totalCount: number;
  timeline: TimelineSavedObjectRuntimeResponseType[];
}> => {
  const options: SavedObjectsFindOptions = {
    type: timelineSavedObjectType,
    filter: `siem-ui-timeline.attributes.templateTimelineId: "${templateTimelineId}"`,
  };

  return getAllSavedTimeline(request, options);
};

export const getTimelineTemplateOrNull = async (
  frameworkRequest: FrameworkRequest,
  templateTimelineId: string
): Promise<TimelineSavedObjectRuntimeResponseType | null> => {
  try {
    const templateTimelineResponse = await getTimelineByTemplateTimelineId(
      frameworkRequest,
      templateTimelineId
    );

    const timeline = templateTimelineResponse?.timeline[0];

    if (!timeline) {
      return null;
    }

    const response: TimelineSavedObjectRuntimeResponseType = {
      columns: timeline.columns,
      dataProviders: timeline.dataProviders,
      dataViewId: timeline.dataViewId,
      description: timeline.description,
      eqlOptions: timeline.eqlOptions,
      eventType: timeline.eventType,
      excludedRowRendererIds: timeline.excludedRowRendererIds,
      favorite: timeline.favorite,
      filters: timeline.filters,
      indexNames: timeline.indexNames,
      kqlMode: timeline.kqlMode,
      kqlQuery: timeline.kqlQuery,
      title: timeline.title,
      templateTimelineId: timeline.templateTimelineId,
      templateTimelineVersion: timeline.templateTimelineVersion,
      timelineType: timeline.timelineType,
      dateRange: timeline.dateRange,
      savedQueryId: timeline.savedQueryId,
      sort: timeline.sort,
      status: timeline.status,
      created: timeline.created,
      createdBy: timeline.createdBy,
      updated: timeline.updated,
      updatedBy: timeline.updatedBy,
      savedObjectId: timeline.savedObjectId,
      version: timeline.version,
      eventIdToNoteIds: timeline.eventIdToNoteIds,
      noteIds: timeline.noteIds,
      notes: timeline.notes,
      pinnedEventIds: timeline.pinnedEventIds,
      pinnedEventsSaveObject: timeline.pinnedEventsSaveObject,
    };
    return response;
  } catch (e) {
    return null;
  }
};

/** The filter here is able to handle the legacy data,
 * which has no timelineType exists in the savedObject */
const getTimelineTypeFilter = (
  timelineType: TimelineTypeLiteralWithNull,
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

  const filters = [typeFilter, draftFilter, immutableFilter];
  return combineFilters(filters);
};

const getTimelineFavoriteFilter = ({
  onlyUserFavorite,
  request,
}: {
  onlyUserFavorite: boolean | null;
  request: FrameworkRequest;
}) => {
  if (!onlyUserFavorite) {
    return null;
  }
  const username = request.user?.username ?? UNAUTHENTICATED_USER;
  return `siem-ui-timeline.attributes.favorite.keySearch: ${convertStringToBase64(username)}`;
};

const combineFilters = (filters: Array<string | null>) =>
  filters.filter((f) => f != null).join(' and ');

const getTimelinesCreatedAndUpdatedByCurrentUser = ({ request }: { request: FrameworkRequest }) => {
  const username = request.user?.username ?? UNAUTHENTICATED_USER;
  const updatedBy = `siem-ui-timeline.attributes.updatedBy: ${username}`;
  const createdBy = `siem-ui-timeline.attributes.createdBy: ${username}`;
  return combineFilters([updatedBy, createdBy]);
};

export const getExistingPrepackagedTimelines = async (
  request: FrameworkRequest,
  countsOnly?: boolean,
  pageInfo?: PageInfoTimeline
): Promise<{
  totalCount: number;
  timeline: TimelineSavedObjectRuntimeResponseType[];
}> => {
  const queryPageInfo =
    countsOnly && pageInfo == null
      ? {
          perPage: 1,
          page: 1,
        }
      : { perPage: pageInfo?.pageSize, page: pageInfo?.pageIndex } ?? {};
  const elasticTemplateTimelineOptions = {
    type: timelineSavedObjectType,
    ...queryPageInfo,
    filter: getTimelineTypeFilter(TimelineType.template, TimelineStatus.immutable),
  };

  return getAllSavedTimeline(request, elasticTemplateTimelineOptions);
};

export const getAllTimeline = async (
  request: FrameworkRequest,
  onlyUserFavorite: boolean | null,
  pageInfo: PageInfoTimeline,
  search: string | null,
  sort: SortTimeline | null,
  status: TimelineStatusLiteralWithNull,
  timelineType: TimelineTypeLiteralWithNull
): Promise<AllTimelinesResponse> => {
  const searchTerm = search != null ? search : undefined;
  const searchFields = ['title', 'description'];
  const filter = combineFilters([
    getTimelineTypeFilter(timelineType ?? null, status ?? null),
    getTimelineFavoriteFilter({ onlyUserFavorite, request }),
  ]);
  const options: SavedObjectsFindOptions = {
    type: timelineSavedObjectType,
    perPage: pageInfo.pageSize,
    page: pageInfo.pageIndex,
    filter,
    search: searchTerm,
    searchFields,
    sortField: sort != null ? sort.sortField : undefined,
    sortOrder: sort != null ? sort.sortOrder : undefined,
  };

  const timelineOptions = {
    type: timelineSavedObjectType,
    perPage: 1,
    page: 1,
    filter: getTimelineTypeFilter(TimelineType.default, TimelineStatus.active),
  };

  const templateTimelineOptions = {
    type: timelineSavedObjectType,
    perPage: 1,
    page: 1,
    filter: getTimelineTypeFilter(TimelineType.template, null),
  };

  const customTemplateTimelineOptions = {
    type: timelineSavedObjectType,
    perPage: 1,
    page: 1,
    filter: getTimelineTypeFilter(TimelineType.template, TimelineStatus.active),
  };

  const favoriteTimelineOptions = {
    type: timelineSavedObjectType,
    search: searchTerm,
    searchFields,
    perPage: 1,
    page: 1,
    filter: combineFilters([
      getTimelineTypeFilter(timelineType ?? null, TimelineStatus.active),
      getTimelineFavoriteFilter({ onlyUserFavorite: true, request }),
    ]),
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
  const filter = combineFilters([
    getTimelineTypeFilter(timelineType ?? null, TimelineStatus.draft),
    getTimelinesCreatedAndUpdatedByCurrentUser({ request }),
  ]);
  const options: SavedObjectsFindOptions = {
    type: timelineSavedObjectType,
    perPage: 1,
    filter,
    sortField: 'created',
    sortOrder: 'desc',
  };
  return getAllSavedTimeline(request, options);
};

export const persistFavorite = async (
  request: FrameworkRequest,
  timelineId: string | null,
  templateTimelineId: string | null,
  templateTimelineVersion: number | null,
  timelineType: TimelineType
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

    const persistResponse = await persistTimeline(request, timelineId, null, {
      ...timeline,
      templateTimelineId,
      templateTimelineVersion,
      timelineType,
    });
    return {
      savedObjectId: persistResponse.timeline.savedObjectId,
      version: persistResponse.timeline.version,
      favorite:
        persistResponse.timeline.favorite != null
          ? persistResponse.timeline.favorite.filter((fav) => fav.userName === userName)
          : [],
      templateTimelineId,
      templateTimelineVersion,
      timelineType,
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
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  const userInfo = isImmutable ? ({ username: 'Elastic' } as AuthenticatedUser) : request.user;
  try {
    if (timelineId == null) {
      return await createTimeline({ timelineId, timeline, userInfo, savedObjectsClient });
    }
    return await updateTimeline({
      request,
      timelineId,
      timeline,
      userInfo,
      savedObjectsClient,
      version,
    });
  } catch (err) {
    if (timelineId != null && SavedObjectsErrorHelpers.isConflictError(err)) {
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

export const createTimeline = async ({
  timelineId,
  timeline,
  savedObjectsClient,
  userInfo,
}: {
  timelineId: string | null;
  timeline: SavedTimeline;
  savedObjectsClient: SavedObjectsClientContract;
  userInfo: AuthenticatedUser | null;
}) => {
  const { transformedFields: migratedAttributes, references } =
    timelineFieldsMigrator.extractFieldsToReferences<TimelineWithoutExternalRefs>({
      data: pickSavedTimeline(timelineId, timeline, userInfo),
    });

  const createdTimeline = await savedObjectsClient.create<TimelineWithoutExternalRefs>(
    timelineSavedObjectType,
    migratedAttributes,
    {
      references,
    }
  );

  const repopulatedSavedObject =
    timelineFieldsMigrator.populateFieldsFromReferences(createdTimeline);

  // Create new timeline
  const newTimeline = convertSavedObjectToSavedTimeline(repopulatedSavedObject);
  return {
    code: 200,
    message: 'success',
    timeline: newTimeline,
  };
};

const updateTimeline = async ({
  request,
  timelineId,
  timeline,
  savedObjectsClient,
  userInfo,
  version,
}: {
  request: FrameworkRequest;
  timelineId: string;
  timeline: SavedTimeline;
  savedObjectsClient: SavedObjectsClientContract;
  userInfo: AuthenticatedUser | null;
  version: string | null;
}) => {
  const rawTimelineSavedObject = await savedObjectsClient.get<TimelineWithoutExternalRefs>(
    timelineSavedObjectType,
    timelineId
  );

  const { transformedFields: migratedPatchAttributes, references } =
    timelineFieldsMigrator.extractFieldsToReferences<TimelineWithoutExternalRefs>({
      data: pickSavedTimeline(timelineId, timeline, userInfo),
      existingReferences: rawTimelineSavedObject.references,
    });

  // Update Timeline
  await savedObjectsClient.update(timelineSavedObjectType, timelineId, migratedPatchAttributes, {
    version: version || undefined,
    references,
  });

  return {
    code: 200,
    message: 'success',
    timeline: await getSavedTimeline(request, timelineId),
  };
};

export const updatePartialSavedTimeline = async (
  request: FrameworkRequest,
  timelineId: string,
  timeline: SavedTimeline
) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  const currentSavedTimeline = await savedObjectsClient.get<SavedTimeline>(
    timelineSavedObjectType,
    timelineId
  );

  const { transformedFields, references } =
    timelineFieldsMigrator.extractFieldsToReferences<TimelineWithoutExternalRefs>({
      data: timeline,
      existingReferences: currentSavedTimeline.references,
    });

  const timelineUpdateAttributes = pickSavedTimeline(
    null,
    {
      ...transformedFields,
      dateRange: currentSavedTimeline.attributes.dateRange,
    },
    request.user
  );

  const updatedTimeline = await savedObjectsClient.update<TimelineWithoutExternalRefs>(
    timelineSavedObjectType,
    timelineId,
    timelineUpdateAttributes,
    { references }
  );

  const populatedTimeline =
    timelineFieldsMigrator.populateFieldsFromReferencesForPatch<TimelineWithoutExternalRefs>({
      dataBeforeRequest: timeline,
      dataReturnedFromRequest: updatedTimeline,
    });

  return populatedTimeline;
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
  const savedObjectsClient = (await request.context.core).savedObjects.client;

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

const resolveBasicSavedTimeline = async (request: FrameworkRequest, timelineId: string) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  const { saved_object: savedObject, ...resolveAttributes } =
    await savedObjectsClient.resolve<TimelineWithoutExternalRefs>(
      timelineSavedObjectType,
      timelineId
    );

  const populatedTimeline = timelineFieldsMigrator.populateFieldsFromReferences(savedObject);

  return {
    resolvedTimelineSavedObject: convertSavedObjectToSavedTimeline(populatedTimeline),
    ...resolveAttributes,
  };
};

const resolveSavedTimeline = async (request: FrameworkRequest, timelineId: string) => {
  const userName = request.user?.username ?? UNAUTHENTICATED_USER;

  const { resolvedTimelineSavedObject, ...resolveAttributes } = await resolveBasicSavedTimeline(
    request,
    timelineId
  );

  const timelineWithNotesAndPinnedEvents = await Promise.all([
    note.getNotesByTimelineId(request, resolvedTimelineSavedObject.savedObjectId),
    pinnedEvent.getAllPinnedEventsByTimelineId(request, resolvedTimelineSavedObject.savedObjectId),
    resolvedTimelineSavedObject,
  ]);

  const [notes, pinnedEvents, timeline] = timelineWithNotesAndPinnedEvents;

  return {
    timeline: timelineWithReduxProperties(notes, pinnedEvents, timeline, userName),
    ...resolveAttributes,
  };
};

const getBasicSavedTimeline = async (request: FrameworkRequest, timelineId: string) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  const savedObject = await savedObjectsClient.get<TimelineWithoutExternalRefs>(
    timelineSavedObjectType,
    timelineId
  );

  const populatedTimeline = timelineFieldsMigrator.populateFieldsFromReferences(savedObject);

  return convertSavedObjectToSavedTimeline(populatedTimeline);
};

const getSavedTimeline = async (request: FrameworkRequest, timelineId: string) => {
  const userName = request.user?.username ?? UNAUTHENTICATED_USER;

  const timelineSaveObject = await getBasicSavedTimeline(request, timelineId);

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
  const savedObjectsClient = (await request.context.core).savedObjects.client;

  const savedObjects = await savedObjectsClient.find<TimelineWithoutExternalRefs>(options);

  const timelinesWithNotesAndPinnedEvents = await Promise.all(
    savedObjects.saved_objects.map(async (savedObject) => {
      const migratedSO = timelineFieldsMigrator.populateFieldsFromReferences(savedObject);

      const timelineSaveObject = convertSavedObjectToSavedTimeline(migratedSO);

      return Promise.all([
        note.getNotesByTimelineId(request, timelineSaveObject.savedObjectId),
        pinnedEvent.getAllPinnedEventsByTimelineId(request, timelineSaveObject.savedObjectId),
        timelineSaveObject,
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

export const timelineWithReduxProperties = (
  notes: NoteSavedObject[],
  pinnedEvents: PinnedEventSavedObject[],
  timeline: TimelineSavedObjectRuntimeResponseType,
  userName: string
): TimelineSavedObjectRuntimeResponseType => ({
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

export const getSelectedTimelines = async (
  request: FrameworkRequest,
  timelineIds?: string[] | null
) => {
  const savedObjectsClient = (await request.context.core).savedObjects.client;
  let exportedIds = timelineIds;
  if (timelineIds == null || timelineIds.length === 0) {
    const { timeline: savedAllTimelines } = await getAllTimeline(
      request,
      false,
      {
        pageIndex: 1,
        pageSize: timelineIds?.length ?? 0,
      },
      null,
      null,
      TimelineStatus.active,
      null
    );
    exportedIds = savedAllTimelines.map((t) => t.savedObjectId);
  }

  const savedObjects = await Promise.resolve(
    savedObjectsClient.bulkGet<TimelineWithoutExternalRefs>(
      (exportedIds ?? []).reduce(
        (acc, timelineId) => [...acc, { id: timelineId, type: timelineSavedObjectType }],
        [] as Array<{ id: string; type: string }>
      )
    )
  );

  const timelineObjects: {
    timelines: TimelineSavedObjectRuntimeResponseType[];
    errors: ExportTimelineNotFoundError[];
  } = savedObjects.saved_objects.reduce(
    (acc, savedObject) => {
      if (savedObject.error == null) {
        const populatedTimeline = timelineFieldsMigrator.populateFieldsFromReferences(savedObject);

        return {
          errors: acc.errors,
          timelines: [...acc.timelines, convertSavedObjectToSavedTimeline(populatedTimeline)],
        };
      }

      return { errors: [...acc.errors, savedObject.error], timelines: acc.timelines };
    },
    {
      timelines: [] as TimelineSavedObjectRuntimeResponseType[],
      errors: [] as ExportTimelineNotFoundError[],
    }
  );

  return timelineObjects;
};
