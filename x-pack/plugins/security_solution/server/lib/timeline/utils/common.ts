/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';
import { set } from '@elastic/safer-lodash-set/fp';
import readline from 'readline';
import fs from 'fs';
import { Readable } from 'stream';
import { createListStream } from '@kbn/utils';
import { schema } from '@kbn/config-schema';
import { isObject } from 'lodash/fp';

import { KibanaRequest } from 'src/core/server';
import { SetupPlugins, StartPlugins } from '../../../plugin';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';

import { FrameworkRequest } from '../../framework';

export const buildFrameworkRequest = async (
  context: SecuritySolutionRequestHandlerContext,
  security: StartPlugins['security'] | SetupPlugins['security'] | undefined,
  request: KibanaRequest
): Promise<FrameworkRequest> => {
  const savedObjectsClient = context.core.savedObjects.client;
  const user = await security?.authc.getCurrentUser(request);

  return set<FrameworkRequest>(
    'user',
    user,
    set<KibanaRequest & { context: SecuritySolutionRequestHandlerContext }>(
      'context.core.savedObjects.client',
      savedObjectsClient,
      request
    )
  );
};

export const escapeHatch = schema.object({}, { unknowns: 'allow' });

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils/src/format_errors/index.ts
 */
export const formatErrors = (errors: rt.Errors): string[] => {
  const err = errors.map((error) => {
    if (error.message != null) {
      return error.message;
    } else {
      const keyContext = error.context
        .filter(
          (entry) => entry.key != null && !Number.isInteger(+entry.key) && entry.key.trim() !== ''
        )
        .map((entry) => entry.key)
        .join(',');

      const nameContext = error.context.find((entry) => entry.type?.name?.length > 0);
      const suppliedValue =
        keyContext !== '' ? keyContext : nameContext != null ? nameContext.type.name : '';
      const value = isObject(error.value) ? JSON.stringify(error.value) : error.value;
      return `Invalid value "${value}" supplied to "${suppliedValue}"`;
    }
  });

  return [...new Set(err)];
};

type ErrorFactory = (message: string) => Error;

export const throwErrors = (createError: ErrorFactory) => (errors: rt.Errors) => {
  throw createError(formatErrors(errors).join('\n'));
};

export const getReadables = (dataPath: string): Promise<Readable> =>
  new Promise((resolved, reject) => {
    const contents: string[] = [];
    const readable = fs.createReadStream(dataPath, { encoding: 'utf-8' });

    readable.on('data', (stream) => {
      contents.push(stream as string);
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
