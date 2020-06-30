/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import readline from 'readline';
import fs from 'fs';
import path, { join, resolve } from 'path';
import { Readable } from 'stream';
import { createListStream } from '../../../../../../../src/legacy/utils';
import { importTimelines } from '../../timeline/routes/utils/import_timelines';
import { FrameworkRequest } from '../../framework';
import { ImportTimelineResultSchema } from '../../timeline/routes/schemas/import_timelines_schema';
import { getTimelinesToInstall } from './get_timelines_to_install';
import { getTimelinesToUpdate } from './get_timelines_to_update';
import { getExistingPrepackagedTimelines } from '../../timeline/saved_object';
import { TimelineSavedObject } from '../../../../common/types/timeline';

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

const loadData = <T>(
  readStream: Readable,
  bulkInsert: (docs: Readable | string[]) => Promise<T | string>,
  encoding?: 'utf-8' | null,
  maxTimelineImportExportSize?: number | null
): Promise<T | string> => {
  return new Promise((resolved, reject) => {
    let docs: string[] = [];
    let isPaused: boolean = false;

    const lineStream = readline.createInterface({ input: readStream });
    const onClose = async () => {
      if (docs.length > 0) {
        try {
          const docstmp = createListStream(docs.join('\n'));

          const bulkInsertResult = await bulkInsert(encoding === 'utf-8' ? docs : docstmp);
          resolved(bulkInsertResult);
        } catch (err) {
          reject(err);
          return;
        }
      }
      resolved({
        success: true,
        success_count: 0,
        errors: [],
        timelines_installed: 0,
        timelines_updated: 0,
      });
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
          await bulkInsert(encoding === 'utf-8' ? docs : docstmp);
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
): Promise<ImportTimelineResultSchema | string> => {
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

  return loadData<ImportTimelineResultSchema>(
    readStream,
    (docs: string[] | Readable) =>
      importTimelines(docs, maxTimelineImportExportSize, frameworkRequest, isImmutable),
    null,
    maxTimelineImportExportSize
  );
};

interface CheckTimelinesStatus {
  timelinesToInstall: [];
  timelinesToUpdate: [];
  prepackagedTimelines: [];
}

export const checkTimelinesStatus = async (
  frameworkRequest: FrameworkRequest,
  filePath?: string,
  fileName?: string
): Promise<CheckTimelinesStatus | string> => {
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

  return loadData<CheckTimelinesStatus>(
    readStream,
    (timelinesFromFileSystem: Readable | string[]) => {
      const parsedTimelinesFromFileSystem = timelinesFromFileSystem.map((t) => JSON.parse(t));
      const prepackagedTimelines = timeline.timeline ?? [];

      const timelinesToInstall = getTimelinesToInstall(
        parsedTimelinesFromFileSystem,
        prepackagedTimelines
      );
      const timelinesToUpdate = getTimelinesToUpdate(
        parsedTimelinesFromFileSystem,
        prepackagedTimelines
      );

      return {
        timelinesToInstall,
        timelinesToUpdate,
        prepackagedTimelines,
      };
    },
    'utf-8'
  );
};
