/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import { FileStatus } from '../../common/types';

interface PercentileAgg {
  '1.0': number | null;
  '5.0': number | null;
  '25.0': number | null;
  '50.0': number | null;
  '75.0': number | null;
  '95.0': number | null;
  '99.0': number | null;
}

const percentileAgg: MakeSchemaFrom<PercentileAgg> = {
  '1.0': { type: 'long' },
  '5.0': { type: 'long' },
  '25.0': { type: 'long' },
  '50.0': { type: 'long' },
  '75.0': { type: 'long' },
  '95.0': { type: 'long' },
  '99.0': { type: 'long' },
};

interface CountAndSize {
  count: number;
  size: number;
}

const countAndSize: MakeSchemaFrom<CountAndSize> = {
  count: { type: 'long' },
  size: { type: 'long' },
};

interface FileKind extends CountAndSize {
  kind: string;
}

export interface FileKindUsageSchema extends CountAndSize {
  bytes_used: number;
  share_count: number;
  file_kind_breakdown: FileKind[];
  status: {
    [status in FileStatus]: CountAndSize;
  };
}

export const schema: MakeSchemaFrom<FileKindUsageSchema> = {
  ...countAndSize,
  share_count: {
    type: 'long',
    _meta: {
      description: 'Count of file share saved objects',
    },
  },
  bytes_used: {
    type: 'long',
    _meta: {
      description: 'Total bytes used by files with saved objects',
    },
  },
  file_kind_breakdown: {
    type: 'array',
    items: {
      kind: {
        type: 'keyword',
        _meta: {
          description: 'Name of the file kind',
        },
      },
      ...countAndSize,
    },
  },
  status: {
    AWAITING_UPLOAD: countAndSize,
    DELETED: countAndSize,
    READY: countAndSize,
    UPLOADING: countAndSize,
    UPLOAD_ERROR: countAndSize,
  },
};
