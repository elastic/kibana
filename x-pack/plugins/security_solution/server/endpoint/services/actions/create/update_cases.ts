/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetRelatedCasesByAlertResponse } from '@kbn/cases-plugin/common';
import { AttachmentType } from '@kbn/cases-plugin/common';
import type { CasesClient } from '@kbn/cases-plugin/server';
import type { BulkCreateArgs } from '@kbn/cases-plugin/server/client/attachments/types';
import { APP_ID } from '../../../../../common';
import type {
  ImmutableObject,
  HostMetadataInterface,
  HostMetadata,
} from '../../../../../common/endpoint/types';
import type { CreateActionPayload } from './types';

export const updateCases = async ({
  casesClient,
  createActionPayload,
  endpointData,
}: {
  casesClient?: CasesClient;
  createActionPayload: CreateActionPayload;
  endpointData: Array<ImmutableObject<HostMetadataInterface>>;
}): Promise<void> => {
  if (!casesClient) {
    return;
  }
  // convert any alert IDs into cases
  let caseIDs: string[] = createActionPayload.case_ids?.slice() || [];
  if (createActionPayload.alert_ids && createActionPayload.alert_ids.length > 0) {
    const newIDs: string[][] = await Promise.all(
      createActionPayload.alert_ids.map(async (alertID: string) => {
        const cases: GetRelatedCasesByAlertResponse = await casesClient.cases.getCasesByAlertID({
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
    const targets = endpointData.map((endpoint: HostMetadata) => ({
      hostname: endpoint.host.hostname,
      endpointId: endpoint.agent.id,
    }));

    const attachments = caseIDs.map(() => ({
      type: AttachmentType.actions,
      comment: createActionPayload.comment || '',
      actions: {
        targets,
        type: createActionPayload.command,
      },
      owner: APP_ID,
    })) as BulkCreateArgs['attachments'];

    await Promise.all(
      caseIDs.map((caseId) =>
        casesClient.attachments.bulkCreate({
          caseId,
          attachments,
        })
      )
    );
  }
};
