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
import { KibanaResponseFactory } from '../../../../../../../src/core/server/';
import { FrameworkRequest } from '../../framework';
import { ImportTimelineResultSchema } from '../../timeline/routes/schemas/import_timelines_schema';

const getReadables = (dataPath: string): Promise<Readable> =>
  new Promise((resolved, reject) => {
    const contents: Buffer[] = [];
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

export const loadData = (
  readStream: Readable,
  maxTimelineImportExportSize: number,
  bulkInsert: (docs: Readable) => Promise<ImportTimelineResultSchema | string>
): Promise<ImportTimelineResultSchema | string> => {
  return new Promise((resolved, reject) => {
    let docs: string[] = [];
    let isPaused: boolean = false;

    const lineStream = readline.createInterface({ input: readStream });
    const onClose = async () => {
      if (docs.length > 0) {
        try {
          const docstmp = createListStream(docs.join('\n'));

          const bulkInsertResult = await bulkInsert(docstmp);
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
    lineStream.on('close', onClose);

    const closeWithError = (err: Error) => {
      lineStream.removeListener('close', onClose);
      lineStream.close();
      reject(err);
    };

    lineStream.on('line', async (line) => {
      if (line.length === 0 || line.charAt(0) === '/' || line.charAt(0) === ' ') {
        return;
      }

      docs.push(line);

      if (docs.length >= maxTimelineImportExportSize && !isPaused) {
        lineStream.pause();

        const docstmp = createListStream(docs.join('\n'));
        docs = [];

        try {
          await bulkInsert(docstmp);
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
  response: KibanaResponseFactory,
  frameworkRequest: FrameworkRequest,
  isImmutable: boolean
): Promise<ImportTimelineResultSchema | string> => {
  const dir = resolve(join(__dirname, './prepackaged_timelines'));
  const fileName = 'index.ndjson';
  const dataPath = path.join(dir, fileName);

  const readStream = await getReadables(dataPath);

  return loadData(readStream, maxTimelineImportExportSize, (docs) =>
    importTimelines(docs, maxTimelineImportExportSize, response, frameworkRequest, isImmutable)
  );
};
