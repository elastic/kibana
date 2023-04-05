/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path, { join, resolve } from 'path';
import { Readable } from 'stream';

import type { ImportTimelineResultSchema } from '../../../../../../common/types/timeline';

import type { FrameworkRequest } from '../../../../framework';

import { importTimelines } from '../../timelines/import_timelines';

import { loadData, getReadables } from '../../../utils/common';

export const installPrepackagedTimelines = async (
  maxTimelineImportExportSize: number,
  frameworkRequest: FrameworkRequest,
  isImmutable: boolean,
  filePath?: string,
  fileName?: string
): Promise<ImportTimelineResultSchema | Error> => {
  let readStream;
  const dir = resolve(
    join(
      __dirname,
      filePath ?? '../../../../detection_engine/prebuilt_rules/content/prepackaged_timelines'
    )
  );
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
