/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { ENABLE_CASE_CONNECTOR } from '../../../common/constants';
import { CasesClientArgs } from '..';
import { createCaseError } from '../../common/error';
import { AttachmentService, CaseService } from '../../services';
import { buildCaseUserActionItem } from '../../services/user_actions/helpers';
import { Operations } from '../../authorization';
import { createAuditMsg } from '../utils';

async function deleteSubCases({
  attachmentService,
  caseService,
  soClient,
  caseIds,
}: {
  attachmentService: AttachmentService;
  caseService: CaseService;
  soClient: SavedObjectsClientContract;
  caseIds: string[];
}) {
  const subCasesForCaseIds = await caseService.findSubCasesByCaseId({ soClient, ids: caseIds });

  const subCaseIDs = subCasesForCaseIds.saved_objects.map((subCase) => subCase.id);
  const commentsForSubCases = await caseService.getAllSubCaseComments({
    soClient,
    id: subCaseIDs,
  });

  // This shouldn't actually delete anything because all the comments should be deleted when comments are deleted
  // per case ID
  await Promise.all(
    commentsForSubCases.saved_objects.map((commentSO) =>
      attachmentService.delete({ soClient, attachmentId: commentSO.id })
    )
  );

  await Promise.all(
    subCasesForCaseIds.saved_objects.map((subCaseSO) =>
      caseService.deleteSubCase(soClient, subCaseSO.id)
    )
  );
}

export async function deleteCases(ids: string[], clientArgs: CasesClientArgs): Promise<void> {
  const {
    savedObjectsClient: soClient,
    caseService,
    attachmentService,
    user,
    userActionService,
    logger,
    authorization: auth,
    auditLogger,
  } = clientArgs;
  try {
    const cases = await caseService.getCases({ soClient, caseIds: ids });
    const owners = new Set<string>();

    for (const theCase of cases.saved_objects) {
      owners.add(theCase.attributes.owner);
    }

    try {
      await auth.ensureAuthorized([...owners.values()], Operations.deleteCase);
    } catch (error) {
      auditLogger?.log(createAuditMsg({ operation: Operations.deleteCase, error }));
      throw error;
    }

    await Promise.all(
      ids.map((id) =>
        caseService.deleteCase({
          soClient,
          id,
        })
      )
    );

    const comments = await Promise.all(
      ids.map((id) =>
        caseService.getAllCaseComments({
          soClient,
          id,
        })
      )
    );

    if (comments.some((c) => c.saved_objects.length > 0)) {
      await Promise.all(
        comments.map((c) =>
          Promise.all(
            c.saved_objects.map(({ id }) =>
              attachmentService.delete({
                soClient,
                attachmentId: id,
              })
            )
          )
        )
      );
    }

    if (ENABLE_CASE_CONNECTOR) {
      await deleteSubCases({
        attachmentService,
        caseService,
        soClient,
        caseIds: ids,
      });
    }

    const deleteDate = new Date().toISOString();

    await userActionService.bulkCreate({
      soClient,
      actions: ids.map((id) =>
        buildCaseUserActionItem({
          action: 'create',
          actionAt: deleteDate,
          actionBy: user,
          caseId: id,
          fields: [
            'comment',
            'description',
            'status',
            'tags',
            'title',
            'connector',
            'settings',
            'owner',
            ...(ENABLE_CASE_CONNECTOR ? ['sub_case'] : []),
          ],
        })
      ),
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete cases ids: ${JSON.stringify(ids)}: ${error}`,
      error,
      logger,
    });
  }
}
