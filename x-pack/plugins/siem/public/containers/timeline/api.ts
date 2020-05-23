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
  SavedTimeline,
  TimelineResponse,
  TimelineResponseType,
} from '../../../common/types/timeline';
import { TIMELINE_URL, TIMELINE_IMPORT_URL, TIMELINE_EXPORT_URL } from '../../../common/constants';

import { KibanaServices } from '../../lib/kibana';
import { ExportSelectedData } from '../../components/generic_downloader';

import { createToasterPlainError } from '../case/utils';
import { ImportDataProps, ImportDataResponse } from '../detection_engine/rules';

interface RequestPostTimeline {
  timeline: SavedTimeline;
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
}: RequestPatchTimeline): Promise<TimelineResponse> => {
  const response = await KibanaServices.get().http.patch<TimelineResponse>(TIMELINE_URL, {
    method: 'PATCH',
    body: JSON.stringify({ timeline, timelineId, version }),
  });

  return decodeTimelineResponse(response);
};

export const persistTimeline = async ({
  timelineId,
  timeline,
  version,
}: RequestPersistTimeline): Promise<TimelineResponse> => {
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
  overwrite = false,
  signal,
}: ImportDataProps): Promise<ImportDataResponse> => {
  const formData = new FormData();
  formData.append('file', fileToImport);

  return KibanaServices.get().http.fetch<ImportDataResponse>(`${TIMELINE_IMPORT_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': undefined },
    query: { overwrite },
    body: formData,
    signal,
  });
};

export const exportSelectedTimeline: ExportSelectedData = async ({
  excludeExportDetails = false,
  filename = `timelines_export.ndjson`,
  ids = [],
  signal,
}): Promise<Blob> => {
  const body = ids.length > 0 ? JSON.stringify({ ids }) : undefined;
  const response = await KibanaServices.get().http.fetch<Blob>(`${TIMELINE_EXPORT_URL}`, {
    method: 'POST',
    body,
    query: {
      exclude_export_details: excludeExportDetails,
      file_name: filename,
    },
    signal,
    asResponse: true,
  });

  return response.body!;
};
