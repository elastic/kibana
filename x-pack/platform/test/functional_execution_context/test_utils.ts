/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import JSON5 from 'json5';
import Fs from 'fs/promises';
import { isEqualWith } from 'lodash';
import type { Ecs, KibanaExecutionContext } from '@kbn/core/server';

export const logFilePath = Path.resolve(__dirname, './kibana.log');
export const ANY = Symbol('any');

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

/**
 * Checks the provided log records against the provided predicate
 */
export function assertLogContains({
  logs,
  predicate,
  description,
}: {
  logs: Ecs[];
  predicate: (record: Ecs) => boolean;
  description: string;
}) {
  if (!logs.some(predicate)) {
    throw new Error(`Unable to find log entries: ${description}`);
  }
}

/**
 * Reads the log file and parses the JSON objects that it contains.
 */
export async function readLogFile(): Promise<Ecs[]> {
  await forceSyncLogFile();
  const logFileContent = await Fs.readFile(logFilePath, 'utf-8');
  return logFileContent
    .split('\n')
    .filter(Boolean)
    .map<Ecs>((str) => JSON5.parse(str));
}

/**
 * Truncates the log file to avoid tests looking at the logs from previous executions.
 */
export async function clearLogFile() {
  await Fs.writeFile(logFilePath, '', 'utf8');
  await forceSyncLogFile();
}

/**
 * Force the completion of all the pending I/O operations in the OS related to the log file.
 */
export async function forceSyncLogFile() {
  const fileDescriptor = await Fs.open(logFilePath);
  await fileDescriptor.datasync();
  await fileDescriptor.close();
}
