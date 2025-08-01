/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Fs from 'fs/promises';
import Path from 'path';
import { isEqualWith } from 'lodash';
import type { Ecs, KibanaExecutionContext } from '@kbn/core/server';
import type { RetryService } from '@kbn/ftr-common-functional-services';
import { concatMap, defer, filter, firstValueFrom, ReplaySubject, scan, timeout } from 'rxjs';

export const logFilePath = Path.resolve(__dirname, './kibana.log');
export const ANY = Symbol('any');

let logstream$: ReplaySubject<Ecs> | undefined;

export function getExecutionContextFromLogRecord(record: Ecs | undefined): KibanaExecutionContext {
  if (record?.log?.logger !== 'execution_context' || !record?.message) {
    throw new Error(`The record is not an entry of execution context`);
  }
  return JSON.parse(record.message);
}

export function isExecutionContextLog(
  record: Ecs | undefined,
  executionContext: KibanaExecutionContext
) {
  try {
    const object = getExecutionContextFromLogRecord(record);
    return isEqualWith(object, executionContext, function customizer(obj1: any, obj2: any) {
      if (obj2 === ANY) return true;
    });
  } catch (e) {
    return false;
  }
}

// to avoid splitting log record containing \n symbol
const endOfLine = /(?<=})\s*\n/;
export async function assertLogContains({
  description,
  predicate,
  retry,
}: {
  description: string;
  predicate: (record: Ecs) => boolean;
  retry: RetryService;
}): Promise<void> {
  // logs are written to disk asynchronously. I sacrificed performance to reduce flakiness.
  await retry.waitFor(description, async () => {
    if (!logstream$) {
      logstream$ = getLogstream$();
    }
    try {
      await firstValueFrom(logstream$.pipe(filter(predicate), timeout(5_000)));
      return true;
    } catch (err) {
      return false;
    }
  });
}

/**
 * Creates an observable that continuously tails the log file.
 */
function getLogstream$(): ReplaySubject<Ecs> {
  const stream$ = new ReplaySubject<Ecs>();

  defer(async function* () {
    const fd = await Fs.open(logFilePath, 'rs');
    while (!stream$.isStopped) {
      const { bytesRead, buffer } = await fd.read();
      if (bytesRead) {
        yield buffer.toString('utf8', 0, bytesRead);
      }
    }
    await fd.close();
  })
    .pipe(
      scan<string, { buffer: string; records: Ecs[] }>(
        ({ buffer }, chunk) => {
          const logString = buffer.concat(chunk);
          const lines = logString.split(endOfLine);
          const lastLine = lines.pop();
          const records = lines.map((s) => JSON.parse(s));

          let leftover = '';
          if (lastLine) {
            try {
              const validRecord = JSON.parse(lastLine);
              records.push(validRecord);
            } catch (err) {
              leftover = lastLine;
            }
          }

          return { buffer: leftover, records };
        },
        {
          records: [], // The ECS entries in the logs
          buffer: '', // Accumulated leftovers from the previous operation
        }
      ),
      concatMap(({ records }) => records)
    )
    .subscribe(stream$);

  // let the content start flowing
  stream$.subscribe();

  return stream$;
}

export function closeLogstream() {
  logstream$?.complete();
  logstream$ = undefined;
}

/**
 * Truncates the log file to avoid tests looking at the logs from previous executions.
 */
export async function clearLogFile() {
  closeLogstream();
  await Fs.writeFile(logFilePath, '', 'utf8');
  await forceSyncLogFile();
  logstream$ = getLogstream$();
}

/**
 * Force the completion of all the pending I/O operations in the OS related to the log file.
 */
export async function forceSyncLogFile() {
  const fileDescriptor = await Fs.open(logFilePath);
  await fileDescriptor.datasync();
  await fileDescriptor.close();
}
