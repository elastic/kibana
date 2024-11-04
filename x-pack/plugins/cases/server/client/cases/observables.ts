/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { v4 } from 'uuid';
import { CaseRt } from '../../../common/types/domain';
import {
  AddObservableRequestRt,
  type AddObservableRequest,
  type UpdateObservableRequest,
  UpdateObservableRequestRt,
} from '../../../common/types/api';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import { decodeOrThrow, decodeWithExcessOrThrow } from '../../common/runtime_types';
import { createCaseError } from '../../common/error';
import type { Authorization } from '../../authorization';
import { Operations } from '../../authorization';
import type { CaseSavedObjectTransformed } from '../../common/types/case';

const ensureUpdateAuthorized = async (
  authorization: PublicMethodsOf<Authorization>,
  theCase: CaseSavedObjectTransformed
) => {
  return authorization.ensureAuthorized({
    operation: Operations.updateCase,
    entities: [
      {
        id: theCase.id,
        owner: theCase.attributes.owner,
      },
    ],
  });
};

export const addObservable = async (
  caseId: string,
  params: AddObservableRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
) => {
  const {
    services: { caseService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const paramArgs = decodeWithExcessOrThrow(AddObservableRequestRt)(params);
    const retrievedCase = await caseService.getCase({ id: caseId });
    await ensureUpdateAuthorized(authorization, retrievedCase);

    const currentObservables = retrievedCase.attributes.observables ?? [];

    const res = await caseService.patchCase({
      caseId: retrievedCase.id,
      originalCase: retrievedCase,
      updatedAttributes: {
        observables: [...currentObservables, { ...paramArgs.observable, id: v4() }],
      },
    });

    return decodeOrThrow(CaseRt)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to add observable: ${JSON.stringify(params)}: ${error}`,
      error,
      logger,
    });
  }
};

export const updateObservable = async (
  caseId: string,
  params: UpdateObservableRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
) => {
  const {
    services: { caseService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const paramArgs = decodeWithExcessOrThrow(UpdateObservableRequestRt)(params);
    const retrievedCase = await caseService.getCase({ id: caseId });
    await ensureUpdateAuthorized(authorization, retrievedCase);

    const currentObservables = retrievedCase.attributes.observables ?? [];

    const observableIndex = currentObservables.findIndex(
      (observable) => observable.id === paramArgs.observable.id
    );

    const updatedObservables = [...currentObservables];
    updatedObservables[observableIndex] = paramArgs.observable;

    const res = await caseService.patchCase({
      caseId: retrievedCase.id,
      originalCase: retrievedCase,
      updatedAttributes: {
        observables: updatedObservables,
      },
    });

    return decodeOrThrow(CaseRt)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to update observable: ${JSON.stringify(params)}: ${error}`,
      error,
      logger,
    });
  }
};

export const deleteObservable = async (
  caseId: string,
  observableId: string,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
) => {
  const {
    services: { caseService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const retrievedCase = await caseService.getCase({ id: caseId });
    await ensureUpdateAuthorized(authorization, retrievedCase);

    const updatedObservables = retrievedCase.attributes.observables.filter(
      (observable) => observable.id !== observableId
    );

    await caseService.patchCase({
      caseId: retrievedCase.id,
      originalCase: retrievedCase,
      updatedAttributes: { observables: updatedObservables },
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete observable id: ${JSON.stringify(observableId)}: ${error}`,
      error,
      logger,
    });
  }
};
