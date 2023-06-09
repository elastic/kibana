/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommentType } from '@kbn/cases-plugin/common';
import type { CasesClient } from '@kbn/cases-plugin/server';
import type { CasesByAlertId } from '@kbn/cases-plugin/common/api';
import type {
  HostMetadata,
  HostMetadataInterface,
  ImmutableObject,
} from '../../../../../common/endpoint/types';
import { APP_ID } from '../../../../../common/constants';
import type { CreateActionPayload } from './types';

export const updateCases = async ({
  payload,
  endpointData,
  casesClient,
}: {
  payload: CreateActionPayload;
  endpointData: Array<ImmutableObject<HostMetadataInterface>>;
  casesClient?: CasesClient;
}): Promise<void> => {
  if (!casesClient) {
    return;
  }

  // convert any alert IDs into cases
  let caseIDs: string[] = payload.case_ids?.slice() || [];
  if (payload.alert_ids && payload.alert_ids.length > 0) {
    const newIDs: string[][] = await Promise.all(
      payload.alert_ids.map(async (alertID: string) => {
        const cases: CasesByAlertId = await casesClient.cases.getCasesByAlertID({
          alertID,
          options: { owner: APP_ID },
        });
        return cases.map((caseInfo): string => {
          return caseInfo.id;
        });
      })
    );
    caseIDs = caseIDs.concat(...newIDs);
  }
  caseIDs = [...new Set(caseIDs)];

  // Update all cases with a comment
  if (caseIDs.length > 0) {
    const targets = endpointData.map((endpt: HostMetadata) => ({
      hostname: endpt.host.hostname,
      endpointId: endpt.agent.id,
    }));

    await Promise.all(
      caseIDs.map((caseId) =>
        casesClient.attachments.add({
          caseId,
          comment: {
            type: CommentType.actions,
            comment: payload.comment || '',
            actions: {
              targets,
              type: payload.command,
            },
            owner: APP_ID,
          },
        })
      )
    );
  }
};
