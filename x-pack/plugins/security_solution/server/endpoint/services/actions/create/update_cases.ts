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
import { i18n } from '@kbn/i18n';
import { APP_ID } from '../../../../../common';
import type { HostMetadataInterface } from '../../../../../common/endpoint/types';
import type { CreateActionPayload } from './types';

export interface SimplifiedEndpointData {
  agent: Pick<HostMetadataInterface['agent'], 'id' | 'type'>;
  host: Pick<HostMetadataInterface['host'], 'hostname'>;
}

export const updateCases = async ({
  casesClient,
  createActionPayload,
  endpointData,
}: {
  casesClient?: CasesClient;
  createActionPayload: CreateActionPayload;
  endpointData: SimplifiedEndpointData[];
}): Promise<void> => {
  console.log(1111);
  if (!casesClient) {
    return;
  }
  // convert any alert IDs into cases
  let caseIDs: string[] = createActionPayload.case_ids?.slice() || [];
  console.log(caseIDs);

  if (createActionPayload.alert_ids && createActionPayload.alert_ids.length > 0) {
    console.log('3333');
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
    console.log({ endpointData });
    const targets = endpointData.map((endpoint: SimplifiedEndpointData) => ({
      hostname: endpoint.host.hostname,
      endpointId: endpoint.agent.id,
      type: endpoint.agent.type,
    }));

    const attachments = caseIDs.map(() => ({
      type: AttachmentType.actions,
      comment: createActionPayload.comment || EMPTY_COMMENT,
      actions: {
        targets,
        type: createActionPayload.command,
      },
      owner: APP_ID,
    })) as BulkCreateArgs['attachments'];

    console.log('5', caseIDs);
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

export const EMPTY_COMMENT = i18n.translate(
  'xpack.securitySolution.endpoint.updateCases.emptyComment',
  {
    defaultMessage: 'No comment provided',
  }
);
