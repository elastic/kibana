/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { set } from '@elastic/safer-lodash-set/fp';
import readline from 'readline';
import fs from 'fs';
import { Readable } from 'stream';

import { KibanaRequest, RequestHandlerContext } from 'src/core/server';

import { createListStream } from '../../../../../../../../src/legacy/utils';

import { SetupPlugins } from '../../../../plugin';

import { FrameworkRequest } from '../../../framework';

export const buildFrameworkRequest = async (
  context: RequestHandlerContext,
  security: SetupPlugins['security'],
  request: KibanaRequest
): Promise<FrameworkRequest> => {
  const savedObjectsClient = context.core.savedObjects.client;
  const user = await security?.authc.getCurrentUser(request);

  return set<FrameworkRequest>(
    'user',
    user,
    set<KibanaRequest & { context: RequestHandlerContext }>(
      'context.core.savedObjects.client',
      savedObjectsClient,
      request
    )
  );
};

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

export const loadData = <T, U>(
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

export enum TimelineStatusActions {
  create = 'create',
  createViaImport = 'createViaImport',
  update = 'update',
  updateViaImport = 'updateViaImport',
}

export type TimelineStatusAction =
  | TimelineStatusActions.create
  | TimelineStatusActions.createViaImport
  | TimelineStatusActions.update
  | TimelineStatusActions.updateViaImport;

export * from './compare_timelines_status';
export * from './timeline_object';
