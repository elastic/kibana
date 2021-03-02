/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import {
  CASE_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  SUB_CASE_SAVED_OBJECT,
} from '../../saved_object_types';
import { CaseUserActionsResponseRt, CaseUserActionsResponse } from '../../../common/api';
import { CaseUserActionServiceSetup } from '../../services';

interface GetParams {
  savedObjectsClient: SavedObjectsClientContract;
  userActionService: CaseUserActionServiceSetup;
  caseId: string;
  subCaseId?: string;
}

export const get = async ({
  savedObjectsClient,
  userActionService,
  caseId,
  subCaseId,
}: GetParams): Promise<CaseUserActionsResponse> => {
  const userActions = await userActionService.getUserActions({
    client: savedObjectsClient,
    caseId,
    subCaseId,
  });

  return CaseUserActionsResponseRt.encode(
    userActions.saved_objects.reduce<CaseUserActionsResponse>((acc, ua) => {
      if (subCaseId == null && ua.references.some((uar) => uar.type === SUB_CASE_SAVED_OBJECT)) {
        return acc;
      }
      return [
        ...acc,
        {
          ...ua.attributes,
          action_id: ua.id,
          case_id: ua.references.find((r) => r.type === CASE_SAVED_OBJECT)?.id ?? '',
          comment_id: ua.references.find((r) => r.type === CASE_COMMENT_SAVED_OBJECT)?.id ?? null,
          sub_case_id: ua.references.find((r) => r.type === SUB_CASE_SAVED_OBJECT)?.id ?? '',
        },
      ];
    }, [])
  );
};
