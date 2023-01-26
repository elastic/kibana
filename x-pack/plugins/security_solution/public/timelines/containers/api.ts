/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { isEmpty } from 'lodash';

import { throwErrors } from '@kbn/cases-plugin/common';
import type {
  TimelineResponse,
  TimelineErrorResponse,
  ImportTimelineResultSchema,
  ResponseFavoriteTimeline,
  AllTimelinesResponse,
  SingleTimelineResponse,
  SingleTimelineResolveResponse,
  GetTimelinesArgs,
} from '../../../common/types/timeline';
import {
  TimelineResponseType,
  TimelineStatus,
  TimelineErrorResponseType,
  importTimelineResultSchema,
  allTimelinesResponse,
  responseFavoriteTimeline,
  SingleTimelineResponseType,
  TimelineType,
  ResolvedSingleTimelineResponseType,
} from '../../../common/types/timeline';
import {
  TIMELINE_URL,
  TIMELINE_DRAFT_URL,
  TIMELINE_IMPORT_URL,
  TIMELINE_EXPORT_URL,
  TIMELINE_PREPACKAGED_URL,
  TIMELINE_RESOLVE_URL,
  TIMELINES_URL,
  TIMELINE_FAVORITE_URL,
} from '../../../common/constants';

import { KibanaServices } from '../../common/lib/kibana';
import { ToasterError } from '../../common/components/toasters';
import type {
  ExportDocumentsProps,
  ImportDataProps,
  ImportDataResponse,
} from '../../detection_engine/rule_management/logic';
import type { TimelineInput } from '../../../common/search_strategy';

interface RequestPostTimeline {
  timeline: TimelineInput;
  signal?: AbortSignal;
}

interface RequestPatchTimeline<T = string> extends RequestPostTimeline {
  timelineId: T;
  version: T;
}

type RequestPersistTimeline = RequestPostTimeline & Partial<RequestPatchTimeline<null | string>>;
const createToasterPlainError = (message: string) => new ToasterError([message]);
const decodeTimelineResponse = (respTimeline?: TimelineResponse | TimelineErrorResponse) =>
  pipe(
    TimelineResponseType.decode(respTimeline),
    fold(throwErrors(createToasterPlainError), identity)
  );

const decodeSingleTimelineResponse = (respTimeline?: SingleTimelineResponse) =>
  pipe(
    SingleTimelineResponseType.decode(respTimeline),
    fold(throwErrors(createToasterPlainError), identity)
  );

const decodeResolvedSingleTimelineResponse = (respTimeline?: SingleTimelineResolveResponse) =>
  pipe(
    ResolvedSingleTimelineResponseType.decode(respTimeline),
    fold(throwErrors(createToasterPlainError), identity)
  );

const decodeAllTimelinesResponse = (respTimeline: AllTimelinesResponse) =>
  pipe(
    allTimelinesResponse.decode(respTimeline),
    fold(throwErrors(createToasterPlainError), identity)
  );

const decodeTimelineErrorResponse = (respTimeline?: TimelineErrorResponse) =>
  pipe(
    TimelineErrorResponseType.decode(respTimeline),
    fold(throwErrors(createToasterPlainError), identity)
  );

const decodePrepackedTimelineResponse = (respTimeline?: ImportTimelineResultSchema) =>
  pipe(
    importTimelineResultSchema.decode(respTimeline),
    fold(throwErrors(createToasterPlainError), identity)
  );

const decodeResponseFavoriteTimeline = (respTimeline?: ResponseFavoriteTimeline) =>
  pipe(
    responseFavoriteTimeline.decode(respTimeline),
    fold(throwErrors(createToasterPlainError), identity)
  );

const postTimeline = async ({
  timeline,
}: RequestPostTimeline): Promise<TimelineResponse | TimelineErrorResponse> => {
  let requestBody;
  try {
    requestBody = JSON.stringify({ timeline });
  } catch (err) {
    return Promise.reject(new Error(`Failed to stringify query: ${JSON.stringify(err)}`));
  }

  const response = await KibanaServices.get().http.post<TimelineResponse>(TIMELINE_URL, {
    method: 'POST',
    body: requestBody,
  });

  return decodeTimelineResponse(response);
};

const patchTimeline = async ({
  timelineId,
  timeline,
  version,
}: RequestPatchTimeline): Promise<TimelineResponse | TimelineErrorResponse> => {
  let response = null;
  let requestBody = null;
  try {
    requestBody = JSON.stringify({ timeline, timelineId, version });
  } catch (err) {
    return Promise.reject(new Error(`Failed to stringify query: ${JSON.stringify(err)}`));
  }
  try {
    response = await KibanaServices.get().http.patch<TimelineResponse>(TIMELINE_URL, {
      method: 'PATCH',
      body: requestBody,
    });
  } catch (err) {
    // For Future developer
    // We are not rejecting our promise here because we had issue with our RXJS epic
    // the issue we were not able to pass the right object to it so we did manage the error in the success
    return Promise.resolve(decodeTimelineErrorResponse(err.body));
  }
  return decodeTimelineResponse(response);
};

export const persistTimeline = async ({
  timelineId,
  timeline,
  version,
}: RequestPersistTimeline): Promise<TimelineResponse | TimelineErrorResponse> => {
  try {
    if (isEmpty(timelineId) && timeline.status === TimelineStatus.draft && timeline) {
      const temp: TimelineResponse | TimelineErrorResponse = await cleanDraftTimeline({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        timelineType: timeline.timelineType!,
        templateTimelineId: timeline.templateTimelineId ?? undefined,
        templateTimelineVersion: timeline.templateTimelineVersion ?? undefined,
      });

      const draftTimeline = decodeTimelineResponse(temp);
      const templateTimelineInfo =
        timeline.timelineType === TimelineType.template
          ? {
              templateTimelineId:
                draftTimeline.data.persistTimeline.timeline.templateTimelineId ??
                timeline.templateTimelineId,
              templateTimelineVersion:
                draftTimeline.data.persistTimeline.timeline.templateTimelineVersion ??
                timeline.templateTimelineVersion,
            }
          : {};

      return patchTimeline({
        timelineId: draftTimeline.data.persistTimeline.timeline.savedObjectId,
        timeline: {
          ...timeline,
          ...templateTimelineInfo,
        },
        version: draftTimeline.data.persistTimeline.timeline.version ?? '',
      });
    }

    if (isEmpty(timelineId)) {
      return postTimeline({ timeline });
    }

    return patchTimeline({
      timelineId: timelineId ?? '-1',
      timeline,
      version: version ?? '',
    });
  } catch (err) {
    if (err.status_code === 403 || err.body.status_code === 403) {
      return Promise.resolve({
        data: {
          persistTimeline: {
            code: 403,
            message: err.message || err.body.message,
            timeline: {
              ...timeline,
              savedObjectId: '',
              version: '',
            },
          },
        },
      });
    }
    return Promise.resolve(err);
  }
};

export const importTimelines = async ({
  fileToImport,
  signal,
}: ImportDataProps): Promise<ImportDataResponse> => {
  const formData = new FormData();
  formData.append('file', fileToImport);

  return KibanaServices.get().http.fetch<ImportDataResponse>(`${TIMELINE_IMPORT_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': undefined },
    body: formData,
    signal,
  });
};

export const exportSelectedTimeline = ({
  filename = `timelines_export.ndjson`,
  ids = [],
  signal,
}: ExportDocumentsProps): Promise<Blob | TimelineErrorResponse> => {
  let requestBody;
  try {
    requestBody = ids.length > 0 ? JSON.stringify({ ids }) : undefined;
  } catch (err) {
    return Promise.reject(new Error(`Failed to stringify query: ${JSON.stringify(err)}`));
  }
  return KibanaServices.get().http.fetch<Blob>(`${TIMELINE_EXPORT_URL}`, {
    method: 'POST',
    body: requestBody,
    query: {
      file_name: filename,
    },
    signal,
  });
};

export const getDraftTimeline = async ({
  timelineType,
}: {
  timelineType: TimelineType;
}): Promise<TimelineResponse> => {
  const response = await KibanaServices.get().http.get<TimelineResponse>(TIMELINE_DRAFT_URL, {
    query: {
      timelineType,
    },
  });

  return decodeTimelineResponse(response);
};

export const cleanDraftTimeline = async ({
  timelineType,
  templateTimelineId,
  templateTimelineVersion,
}: {
  timelineType: TimelineType;
  templateTimelineId?: string;
  templateTimelineVersion?: number;
}): Promise<TimelineResponse | TimelineErrorResponse> => {
  let requestBody;
  const templateTimelineInfo =
    timelineType === TimelineType.template
      ? {
          templateTimelineId,
          templateTimelineVersion,
        }
      : {};
  try {
    requestBody = JSON.stringify({
      timelineType,
      ...templateTimelineInfo,
    });
  } catch (err) {
    return Promise.reject(new Error(`Failed to stringify query: ${JSON.stringify(err)}`));
  }
  const response = await KibanaServices.get().http.post<TimelineResponse>(TIMELINE_DRAFT_URL, {
    body: requestBody,
  });

  return decodeTimelineResponse(response);
};

export const installPrepackedTimelines = async (): Promise<ImportTimelineResultSchema> => {
  const response = await KibanaServices.get().http.post<ImportTimelineResultSchema>(
    TIMELINE_PREPACKAGED_URL,
    {}
  );

  return decodePrepackedTimelineResponse(response);
};

export const getTimeline = async (id: string) => {
  const response = await KibanaServices.get().http.get<SingleTimelineResponse>(TIMELINE_URL, {
    query: {
      id,
    },
  });

  return decodeSingleTimelineResponse(response);
};

export const resolveTimeline = async (id: string) => {
  const response = await KibanaServices.get().http.get<SingleTimelineResolveResponse>(
    TIMELINE_RESOLVE_URL,
    {
      query: {
        id,
      },
    }
  );

  return decodeResolvedSingleTimelineResponse(response);
};

export const getTimelineTemplate = async (templateTimelineId: string) => {
  const response = await KibanaServices.get().http.get<SingleTimelineResponse>(TIMELINE_URL, {
    query: {
      template_timeline_id: templateTimelineId,
    },
  });

  return decodeSingleTimelineResponse(response);
};

export const getAllTimelines = async (args: GetTimelinesArgs, abortSignal: AbortSignal) => {
  const response = await KibanaServices.get().http.fetch<AllTimelinesResponse>(TIMELINES_URL, {
    method: 'GET',
    query: {
      ...(args.onlyUserFavorite ? { only_user_favorite: args.onlyUserFavorite } : {}),
      ...(args?.pageInfo?.pageSize ? { page_size: args.pageInfo.pageSize } : {}),
      ...(args?.pageInfo?.pageIndex ? { page_index: args.pageInfo.pageIndex } : {}),
      ...(args.search ? { search: args.search } : {}),
      ...(args?.sort?.sortField ? { sort_field: args?.sort?.sortField } : {}),
      ...(args?.sort?.sortOrder ? { sort_order: args?.sort?.sortOrder } : {}),
      ...(args.status ? { status: args.status } : {}),
      ...(args.timelineType ? { timeline_type: args.timelineType } : {}),
    },
    signal: abortSignal,
  });

  return decodeAllTimelinesResponse(response);
};

export const persistFavorite = async ({
  timelineId,
  templateTimelineId,
  templateTimelineVersion,
  timelineType,
}: {
  timelineId?: string | null;
  templateTimelineId?: string | null;
  templateTimelineVersion?: number | null;
  timelineType: TimelineType;
}) => {
  let requestBody;

  try {
    requestBody = JSON.stringify({
      timelineId,
      templateTimelineId,
      templateTimelineVersion,
      timelineType,
    });
  } catch (err) {
    return Promise.reject(new Error(`Failed to stringify query: ${JSON.stringify(err)}`));
  }

  const response = await KibanaServices.get().http.patch<ResponseFavoriteTimeline>(
    TIMELINE_FAVORITE_URL,
    {
      method: 'PATCH',
      body: requestBody,
    }
  );

  return decodeResponseFavoriteTimeline(response);
};

export const deleteTimelinesByIds = async (savedObjectIds: string[]) => {
  let requestBody;

  try {
    requestBody = JSON.stringify({
      savedObjectIds,
    });
  } catch (err) {
    return Promise.reject(new Error(`Failed to stringify query: ${JSON.stringify(err)}`));
  }
  const response = await KibanaServices.get().http.delete<boolean>(TIMELINE_URL, {
    method: 'DELETE',
    body: requestBody,
  });
  return response;
};
