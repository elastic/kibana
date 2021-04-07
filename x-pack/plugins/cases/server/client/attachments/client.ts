/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';

import { SavedObjectsClientContract } from 'kibana/server';
import { esKuery } from 'src/plugins/data/server';
import {
  AssociationType,
  CaseResponse,
  CommentRequest as AttachmentsRequest,
  CommentsResponse,
  CommentsResponseRt,
  SavedObjectFindOptionsRt,
} from '../../../common/api';
import { checkEnabledCaseConnectorOrThrow } from '../../common';
import { createCaseError } from '../../common/error';
import { defaultPage, defaultPerPage } from '../../routes/api';
import { transformComments } from '../../routes/api/utils';
import { CasesClientInternal } from '../client_internal';
import { CasesClientArgs } from '../types';
import { addComment } from './add';
import { DeleteAllArgs, deleteAll, DeleteArgs, deleteComment } from './delete';

interface AttachmentsAdd {
  caseId: string;
  comment: AttachmentsRequest;
}

const FindQueryParamsRt = rt.partial({
  ...SavedObjectFindOptionsRt.props,
  subCaseId: rt.string,
});

type FindQueryParams = rt.TypeOf<typeof FindQueryParamsRt>;

interface FindArgs {
  soClient: SavedObjectsClientContract;
  caseID: string;
  queryParams?: FindQueryParams;
}

export interface AttachmentsSubClient {
  add(args: AttachmentsAdd): Promise<CaseResponse>;
  deleteAll(deleteAllArgs: DeleteAllArgs): Promise<void>;
  delete(deleteArgs: DeleteArgs): Promise<void>;
  find(findArgs: FindArgs): Promise<CommentsResponse>;
}

export const createAttachmentsSubClient = (
  args: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): AttachmentsSubClient => {
  const attachmentSubClient: AttachmentsSubClient = {
    add: ({ caseId, comment }: AttachmentsAdd) =>
      addComment({
        ...args,
        casesClientInternal,
        caseId,
        comment,
      }),
    deleteAll: (deleteAllArgs: DeleteAllArgs) => deleteAll(deleteAllArgs, args),
    delete: (deleteArgs: DeleteArgs) => deleteComment(deleteArgs, args),
    find: (findArgs: FindArgs) => find(findArgs, args),
  };

  return Object.freeze(attachmentSubClient);
};

async function find(
  { soClient, caseID, queryParams }: FindArgs,
  clientArgs: CasesClientArgs
): Promise<CommentsResponse> {
  try {
    checkEnabledCaseConnectorOrThrow(queryParams?.subCaseId);

    const id = queryParams?.subCaseId ?? caseID;
    const associationType = queryParams?.subCaseId ? AssociationType.subCase : AssociationType.case;
    const { filter, ...queryWithoutFilter } = queryParams ?? {};
    const args = queryParams
      ? {
          caseService: clientArgs.caseService,
          soClient,
          id,
          options: {
            // We need this because the default behavior of getAllCaseComments is to return all the comments
            // unless the page and/or perPage is specified. Since we're spreading the query after the request can
            // still override this behavior.
            page: defaultPage,
            perPage: defaultPerPage,
            sortField: 'created_at',
            filter: filter != null ? esKuery.fromKueryExpression(filter) : filter,
            ...queryWithoutFilter,
          },
          associationType,
        }
      : {
          caseService: clientArgs.caseService,
          soClient,
          id,
          options: {
            page: defaultPage,
            perPage: defaultPerPage,
            sortField: 'created_at',
          },
          associationType,
        };

    const theComments = await clientArgs.caseService.getCommentsByAssociation(args);
    return CommentsResponseRt.encode(transformComments(theComments));
  } catch (error) {
    throw createCaseError({
      message: `Failed to find comments case id: ${caseID}: ${error}`,
      error,
      logger: clientArgs.logger,
    });
  }
}
