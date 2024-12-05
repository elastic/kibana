/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { v4 } from 'uuid';
import Boom from '@hapi/boom';

import { MAX_OBSERVABLES_PER_CASE } from '../../../common/constants';
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
import type { Authorization } from '../../authorization';
import { Operations } from '../../authorization';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import { flattenCaseSavedObject } from '../../common/utils';
import { LICENSING_CASE_OBSERVABLES_FEATURE } from '../../common/constants';
import {
  validateDuplicatedObservablesInRequest,
  validateObservableTypeKeyExists,
} from '../validators';

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
    services: { caseService, licensingService },
    authorization,
  } = clientArgs;

  const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

  if (!hasPlatinumLicenseOrGreater) {
    throw Boom.forbidden(
      'In order to assign observables to cases, you must be subscribed to an Elastic Platinum license'
    );
  }

  licensingService.notifyUsage(LICENSING_CASE_OBSERVABLES_FEATURE);

  try {
    const paramArgs = decodeWithExcessOrThrow(AddObservableRequestRt)(params);
    const retrievedCase = await caseService.getCase({ id: caseId });
    await ensureUpdateAuthorized(authorization, retrievedCase);

    await validateObservableTypeKeyExists(casesClient, {
      caseOwner: retrievedCase.attributes.owner,
      observableTypeKey: params.observable.typeKey,
    });

    const currentObservables = retrievedCase.attributes.observables ?? [];

    if (currentObservables.length === MAX_OBSERVABLES_PER_CASE) {
      throw Boom.forbidden(`Max ${MAX_OBSERVABLES_PER_CASE} observables per case is allowed.`);
    }

    const updatedObservables = [
      ...currentObservables,
      {
        ...paramArgs.observable,
        id: v4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    validateDuplicatedObservablesInRequest({
      requestFields: updatedObservables,
    });

    const updatedCase = await caseService.patchCase({
      caseId: retrievedCase.id,
      originalCase: retrievedCase,
      updatedAttributes: {
        observables: updatedObservables,
      },
    });

    const res = flattenCaseSavedObject({
      savedObject: {
        ...retrievedCase,
        ...updatedCase,
        attributes: { ...retrievedCase.attributes, ...updatedCase?.attributes },
        references: retrievedCase.references,
      },
    });

    return decodeOrThrow(CaseRt)(res);
  } catch (error) {
    throw Boom.badRequest(`Failed to add observable: ${JSON.stringify(params)}: ${error}`);
  }
};

export const updateObservable = async (
  caseId: string,
  observableId: string,
  params: UpdateObservableRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
) => {
  const {
    services: { caseService, licensingService },
    authorization,
  } = clientArgs;

  const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

  if (!hasPlatinumLicenseOrGreater) {
    throw Boom.forbidden(
      'In order to update an observable, you must be subscribed to an Elastic Platinum license'
    );
  }

  licensingService.notifyUsage(LICENSING_CASE_OBSERVABLES_FEATURE);

  try {
    const paramArgs = decodeWithExcessOrThrow(UpdateObservableRequestRt)(params);
    const retrievedCase = await caseService.getCase({ id: caseId });
    await ensureUpdateAuthorized(authorization, retrievedCase);

    const currentObservables = retrievedCase.attributes.observables ?? [];

    const observableIndex = currentObservables.findIndex(
      (observable) => observable.id === observableId
    );

    if (observableIndex === -1) {
      throw Boom.notFound(`Failed to update observable: observable id ${observableId} not found`);
    }

    const updatedObservables = [...currentObservables];
    updatedObservables[observableIndex] = {
      ...updatedObservables[observableIndex],
      ...paramArgs.observable,
      updatedAt: new Date().toISOString(),
    };

    validateDuplicatedObservablesInRequest({
      requestFields: updatedObservables,
    });

    const updatedCase = await caseService.patchCase({
      caseId: retrievedCase.id,
      originalCase: retrievedCase,
      updatedAttributes: {
        observables: updatedObservables,
      },
    });

    const res = flattenCaseSavedObject({
      savedObject: {
        ...retrievedCase,
        ...updatedCase,
        attributes: { ...retrievedCase.attributes, ...updatedCase?.attributes },
        references: retrievedCase.references,
      },
    });

    return decodeOrThrow(CaseRt)(res);
  } catch (error) {
    throw Boom.badRequest(`Failed to update observable: ${JSON.stringify(params)}: ${error}`);
  }
};

export const deleteObservable = async (
  caseId: string,
  observableId: string,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
) => {
  const {
    services: { caseService, licensingService },
    authorization,
  } = clientArgs;

  const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

  if (!hasPlatinumLicenseOrGreater) {
    throw Boom.forbidden(
      'In order to assign observables to cases, you must be subscribed to an Elastic Platinum license'
    );
  }

  licensingService.notifyUsage(LICENSING_CASE_OBSERVABLES_FEATURE);

  try {
    const retrievedCase = await caseService.getCase({ id: caseId });
    await ensureUpdateAuthorized(authorization, retrievedCase);

    const updatedObservables = retrievedCase.attributes.observables.filter(
      (observable) => observable.id !== observableId
    );

    // NOTE: same length of observables pre and post filter means that the observable id has not been found
    if (updatedObservables.length === retrievedCase.attributes.observables.length) {
      throw Boom.notFound(`Failed to delete observable: observable id ${observableId} not found`);
    }

    await caseService.patchCase({
      caseId: retrievedCase.id,
      originalCase: retrievedCase,
      updatedAttributes: { observables: updatedObservables },
    });
  } catch (error) {
    throw Boom.badRequest(
      `Failed to delete observable id: ${JSON.stringify(observableId)}: ${error}`
    );
  }
};
