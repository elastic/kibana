/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import type { PublicMethodsOf } from '@kbn/utility-types';

import {
  SavedObjectsClientContract,
  Logger,
  SavedObjectsUtils,
} from '../../../../../../src/core/server';

import { flattenCaseSavedObject } from '../../routes/api/utils';

import {
  throwErrors,
  excess,
  CaseResponseRt,
  CaseResponse,
  CasesClientPostRequestRt,
  CasePostRequest,
  CaseType,
  User,
} from '../../../common/api';
import { buildCaseUserActionItem } from '../../services/user_actions/helpers';
import {
  getConnectorFromConfiguration,
  transformCaseConnectorToEsConnector,
  transformNewCase,
} from '../utils';

import { CaseConfigureService, CaseService, CaseUserActionService } from '../../services';
import { createCaseError } from '../../common/error';
import { Authorization } from '../../authorization/authorization';
import { Operations } from '../../authorization';
import { AuditLogger, EventOutcome } from '../../../../security/server';
import { ENABLE_CASE_CONNECTOR } from '../../../common/constants';
import { createAuditMsg } from '../../common';

interface CreateCaseArgs {
  caseConfigureService: CaseConfigureService;
  caseService: CaseService;
  user: User;
  savedObjectsClient: SavedObjectsClientContract;
  userActionService: CaseUserActionService;
  theCase: CasePostRequest;
  logger: Logger;
  auth: PublicMethodsOf<Authorization>;
  auditLogger?: AuditLogger;
}

/**
 * Creates a new case.
 */
export const create = async ({
  savedObjectsClient,
  caseService,
  caseConfigureService,
  userActionService,
  user,
  theCase,
  logger,
  auth,
  auditLogger,
}: CreateCaseArgs): Promise<CaseResponse> => {
  // default to an individual case if the type is not defined.
  const { type = CaseType.individual, ...nonTypeCaseFields } = theCase;

  if (!ENABLE_CASE_CONNECTOR && type === CaseType.collection) {
    throw Boom.badRequest(
      'Case type cannot be collection when the case connector feature is disabled'
    );
  }

  const query = pipe(
    // decode with the defaulted type field
    excess(CasesClientPostRequestRt).decode({
      type,
      ...nonTypeCaseFields,
    }),
    fold(throwErrors(Boom.badRequest), identity)
  );

  try {
    const savedObjectID = SavedObjectsUtils.generateId();
    try {
      await auth.ensureAuthorized(query.owner, Operations.createCase);
    } catch (error) {
      auditLogger?.log(createAuditMsg({ operation: Operations.createCase, error, savedObjectID }));
      throw error;
    }

    // log that we're attempting to create a case
    auditLogger?.log(
      createAuditMsg({
        operation: Operations.createCase,
        outcome: EventOutcome.UNKNOWN,
        savedObjectID,
      })
    );

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { username, full_name, email } = user;
    const createdDate = new Date().toISOString();
    const myCaseConfigure = await caseConfigureService.find({ soClient: savedObjectsClient });
    const caseConfigureConnector = getConnectorFromConfiguration(myCaseConfigure);

    const newCase = await caseService.postNewCase({
      soClient: savedObjectsClient,
      attributes: transformNewCase({
        createdDate,
        newCase: query,
        username,
        full_name,
        email,
        connector: transformCaseConnectorToEsConnector(query.connector ?? caseConfigureConnector),
      }),
      id: savedObjectID,
    });

    await userActionService.bulkCreate({
      soClient: savedObjectsClient,
      actions: [
        buildCaseUserActionItem({
          action: 'create',
          actionAt: createdDate,
          actionBy: { username, full_name, email },
          caseId: newCase.id,
          fields: ['description', 'status', 'tags', 'title', 'connector', 'settings'],
          newValue: JSON.stringify(query),
        }),
      ],
    });

    return CaseResponseRt.encode(
      flattenCaseSavedObject({
        savedObject: newCase,
      })
    );
  } catch (error) {
    throw createCaseError({ message: `Failed to create case: ${error}`, error, logger });
  }
};
