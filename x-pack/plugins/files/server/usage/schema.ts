/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import { FileStatus } from '../../common/types';

interface CountAndSize {
  count: number;
  avg_size: null | number;
}

const countAndAvgSize: MakeSchemaFrom<CountAndSize> = {
  count: { type: 'long' },
  avg_size: { type: 'long' },
};

interface FileKind extends CountAndSize {
  kind: string;
}

export interface FileKindUsageSchema extends CountAndSize {
  bytes_used: null | number;
  share_count: number;
  file_kind_breakdown: FileKind[];
  status_breakdown: {
    [status in FileStatus]: CountAndSize;
  };
}

export const schema: MakeSchemaFrom<FileKindUsageSchema> = {
  ...countAndAvgSize,
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
      ...countAndAvgSize,
    },
  },
  status_breakdown: {
    AWAITING_UPLOAD: countAndAvgSize,
    DELETED: countAndAvgSize,
    READY: countAndAvgSize,
    UPLOADING: countAndAvgSize,
    UPLOAD_ERROR: countAndAvgSize,
  },
};
