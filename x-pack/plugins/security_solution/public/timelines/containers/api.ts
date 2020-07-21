/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import { throwErrors } from '../../../../case/common/api';
import {
  TimelineResponse,
  TimelineResponseType,
  TimelineStatus,
  TimelineErrorResponseType,
  TimelineErrorResponse,
  ImportTimelineResultSchema,
  importTimelineResultSchema,
} from '../../../common/types/timeline';
import { TimelineInput, TimelineType } from '../../graphql/types';
import {
  TIMELINE_URL,
  TIMELINE_DRAFT_URL,
  TIMELINE_IMPORT_URL,
  TIMELINE_EXPORT_URL,
  TIMELINE_PREPACKAGED_URL,
} from '../../../common/constants';

import { KibanaServices } from '../../common/lib/kibana';
import { ExportSelectedData } from '../../common/components/generic_downloader';

import { createToasterPlainError } from '../../cases/containers/utils';
import {
  ImportDataProps,
  ImportDataResponse,
} from '../../detections/containers/detection_engine/rules';

interface RequestPostTimeline {
  timeline: TimelineInput;
  signal?: AbortSignal;
}

interface RequestPatchTimeline<T = string> extends RequestPostTimeline {
  timelineId: T;
  version: T;
}

type RequestPersistTimeline = RequestPostTimeline & Partial<RequestPatchTimeline<null | string>>;

const decodeTimelineResponse = (respTimeline?: TimelineResponse) =>
  pipe(
    TimelineResponseType.decode(respTimeline),
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

const postTimeline = async ({ timeline }: RequestPostTimeline): Promise<TimelineResponse> => {
  const response = await KibanaServices.get().http.post<TimelineResponse>(TIMELINE_URL, {
    method: 'POST',
    body: JSON.stringify({ timeline }),
  });

  return decodeTimelineResponse(response);
};

const patchTimeline = async ({
  timelineId,
  timeline,
  version,
}: RequestPatchTimeline): Promise<TimelineResponse | TimelineErrorResponse> => {
  let response = null;
  try {
    response = await KibanaServices.get().http.patch<TimelineResponse>(TIMELINE_URL, {
      method: 'PATCH',
      body: JSON.stringify({ timeline, timelineId, version }),
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
  if (timelineId == null && timeline.status === TimelineStatus.draft && timeline) {
    const draftTimeline = await cleanDraftTimeline({
      timelineType: timeline.timelineType!,
      templateTimelineId: timeline.templateTimelineId ?? undefined,
      templateTimelineVersion: timeline.templateTimelineVersion ?? undefined,
    });

    const templateTimelineInfo =
      timeline.timelineType! === TimelineType.template
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

  if (timelineId == null) {
    return postTimeline({ timeline });
  }

  return patchTimeline({
    timelineId,
    timeline,
    version: version ?? '',
  });
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

export const exportSelectedTimeline: ExportSelectedData = ({
  filename = `timelines_export.ndjson`,
  ids = [],
  signal,
}): Promise<Blob> => {
  const body = ids.length > 0 ? JSON.stringify({ ids }) : undefined;
  return KibanaServices.get().http.fetch<Blob>(`${TIMELINE_EXPORT_URL}`, {
    method: 'POST',
    body,
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
}): Promise<TimelineResponse> => {
  const templateTimelineInfo =
    timelineType === TimelineType.template
      ? {
          templateTimelineId,
          templateTimelineVersion,
        }
      : {};
  const response = await KibanaServices.get().http.post<TimelineResponse>(TIMELINE_DRAFT_URL, {
    body: JSON.stringify({
      timelineType,
      ...templateTimelineInfo,
    }),
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
