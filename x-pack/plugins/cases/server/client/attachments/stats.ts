/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_COMMENT_SAVED_OBJECT } from '../../../common/constants';
import { CommentType } from '../../../common';
import { createCaseError } from '../../common/error';
import { createSavedObjectFileFilter } from '../../files/utils';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import type { GetStatsArgs } from './types';
import { AttachmentStatsRt } from '../../../common/api';

export const getStats = async (
  { caseId }: GetStatsArgs,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
) => {
  const {
    services: { attachmentService },
    logger,
  } = clientArgs;

  try {
    await casesClient.cases.resolve({ id: caseId, includeComments: false });

    const result = await attachmentService.executeCaseAggregations<{ stats: { value: number } }>({
      aggregations: {
        stats: {
          value_count: {
            field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.externalReferenceMetadata.files.name.keyword`,
          },
        },
      },
      attachmentType: CommentType.externalReference,
      caseId,
      filter: createSavedObjectFileFilter(),
    });

    return AttachmentStatsRt.encode({
      files: {
        total: result?.stats.value ?? 0,
      },
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve attachment stats for case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};
