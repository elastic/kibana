/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import readline from 'readline';
import fs from 'fs';
import path, { join, resolve } from 'path';
import { Readable } from 'stream';
import * as rt from 'io-ts';

import { createListStream } from '../../../../../../../src/legacy/utils';
import { importTimelines } from '../../timeline/routes/utils/import_timelines';
import { FrameworkRequest } from '../../framework';
import {
  ImportTimelineResultSchema,
  ImportTimelinesSchemaRt,
} from '../../timeline/routes/schemas/import_timelines_schema';
import { getTimelinesToInstall } from './get_timelines_to_install';
import { getTimelinesToUpdate } from './get_timelines_to_update';
import { getExistingPrepackagedTimelines } from '../../timeline/saved_object';
import {
  TimelineSavedObject,
  TimelineSavedToReturnObjectRuntimeType,
} from '../../../../common/types/timeline';

export const checkTimelineStatusRt = rt.type({
  timelinesToInstall: rt.array(ImportTimelinesSchemaRt),
  timelinesToUpdate: rt.array(ImportTimelinesSchemaRt),
  prepackagedTimelines: rt.array(TimelineSavedToReturnObjectRuntimeType),
});

export type CheckTimelineStatusRt = rt.TypeOf<typeof checkTimelineStatusRt>;

export const getReadables = (dataPath: string): Promise<Readable> =>
  new Promise((resolved, reject) => {
    const contents: string[] = [];
    const readable = fs.createReadStream(dataPath, { encoding: 'utf-8' });

    readable.on('data', (stream) => {
      contents.push(stream);
    });

    readable.on('end', () => {
      const streams = createListStream(contents);
      resolved(streams);
    });

    readable.on('error', (err) => {
      reject(err);
    });
  });

const loadData = <T, U>(
  readStream: Readable,
  bulkInsert: <V>(docs: V) => Promise<U | Error>,
  encoding?: T,
  maxTimelineImportExportSize?: number | null
): Promise<U | Error> => {
  return new Promise((resolved, reject) => {
    let docs: string[] = [];
    let isPaused: boolean = false;

    const lineStream = readline.createInterface({ input: readStream });
    const onClose = async () => {
      if (docs.length > 0) {
        try {
          let bulkInsertResult;
          if (typeof encoding === 'string' && encoding === 'utf-8') {
            bulkInsertResult = await bulkInsert<string[]>(docs);
          } else {
            const docstmp = createListStream(docs.join('\n'));
            bulkInsertResult = await bulkInsert<Readable>(docstmp);
          }
          resolved(bulkInsertResult);
        } catch (err) {
          reject(err);
          return;
        }
      }
      reject(new Error('No data provided'));
    };

    const closeWithError = (err: Error) => {
      lineStream.removeListener('close', onClose);
      lineStream.close();
      reject(err);
    };

    lineStream.on('close', onClose);

    lineStream.on('line', async (line) => {
      if (line.length === 0 || line.charAt(0) === '/' || line.charAt(0) === ' ') {
        return;
      }

      docs.push(line);

      if (
        maxTimelineImportExportSize != null &&
        docs.length >= maxTimelineImportExportSize &&
        !isPaused
      ) {
        lineStream.pause();

        const docstmp = createListStream(docs.join('\n'));
        docs = [];

        try {
          if (typeof encoding === 'string' && encoding === 'utf-8') {
            await bulkInsert<string[]>(docs);
          } else {
            await bulkInsert<Readable>(docstmp);
          }
          lineStream.resume();
        } catch (err) {
          closeWithError(err);
        }
      }
    });

    lineStream.on('pause', async () => {
      isPaused = true;
    });

    lineStream.on('resume', async () => {
      isPaused = false;
    });
  });
};

export const installPrepackagedTimelines = async (
  maxTimelineImportExportSize: number,
  frameworkRequest: FrameworkRequest,
  isImmutable: boolean,
  filePath?: string,
  fileName?: string
): Promise<ImportTimelineResultSchema | Error> => {
  let readStream;
  const dir = resolve(join(__dirname, filePath ?? './prepackaged_timelines'));
  const file = fileName ?? 'index.ndjson';
  const dataPath = path.join(dir, file);
  try {
    readStream = await getReadables(dataPath);
  } catch (err) {
    return {
      success: false,
      success_count: 0,
      timelines_installed: 0,
      timelines_updated: 0,
      errors: [
        {
          error: { message: `read prepackaged timelines error: ${err.message}`, status_code: 500 },
        },
      ],
    };
  }

  return loadData<null, ImportTimelineResultSchema>(readStream, <T>(docs: T) =>
    docs instanceof Readable
      ? importTimelines(docs, maxTimelineImportExportSize, frameworkRequest, isImmutable)
      : Promise.reject(new Error(`read prepackaged timelines error`))
  );
};

export const checkTimelinesStatus = async (
  frameworkRequest: FrameworkRequest,
  filePath?: string,
  fileName?: string
): Promise<CheckTimelineStatusRt | Error> => {
  let readStream;
  let timeline: {
    totalCount: number;
    timeline: TimelineSavedObject[];
  };
  const dir = resolve(join(__dirname, filePath ?? './prepackaged_timelines'));
  const file = fileName ?? 'index.ndjson';
  const dataPath = path.join(dir, file);

  try {
    readStream = await getReadables(dataPath);
    timeline = await getExistingPrepackagedTimelines(frameworkRequest, false);
  } catch (err) {
    return {
      timelinesToInstall: [],
      timelinesToUpdate: [],
      prepackagedTimelines: [],
    };
  }

  return loadData<'utf-8', CheckTimelineStatusRt>(
    readStream,
    <T>(timelinesFromFileSystem: T) => {
      if (Array.isArray(timelinesFromFileSystem)) {
        const parsedTimelinesFromFileSystem = timelinesFromFileSystem.map((t: string) =>
          JSON.parse(t)
        );
        const prepackagedTimelines = timeline.timeline ?? [];

        const timelinesToInstall = getTimelinesToInstall(
          parsedTimelinesFromFileSystem,
          prepackagedTimelines
        );
        const timelinesToUpdate = getTimelinesToUpdate(
          parsedTimelinesFromFileSystem,
          prepackagedTimelines
        );

        return Promise.resolve({
          timelinesToInstall,
          timelinesToUpdate,
          prepackagedTimelines,
        });
      } else {
        return Promise.reject(new Error('load timeline error'));
      }
    },
    'utf-8'
  );
};
