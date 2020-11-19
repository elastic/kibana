/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Logger,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
} from 'kibana/server';

import { ESCasesConfigureAttributes, SavedObjectFindOptions } from '../../../common/api';
import { CASE_CONFIGURE_SAVED_OBJECT } from '../../saved_object_types';

interface ClientArgs {
  client: SavedObjectsClientContract;
}

interface GetCaseConfigureArgs extends ClientArgs {
  caseConfigureId: string;
}
interface FindCaseConfigureArgs extends ClientArgs {
  options?: SavedObjectFindOptions;
}

interface PostCaseConfigureArgs extends ClientArgs {
  attributes: ESCasesConfigureAttributes;
}

interface PatchCaseConfigureArgs extends ClientArgs {
  caseConfigureId: string;
  updatedAttributes: Partial<ESCasesConfigureAttributes>;
}

export interface CaseConfigureServiceSetup {
  delete(args: GetCaseConfigureArgs): Promise<{}>;
  get(args: GetCaseConfigureArgs): Promise<SavedObject<ESCasesConfigureAttributes>>;
  find(args: FindCaseConfigureArgs): Promise<SavedObjectsFindResponse<ESCasesConfigureAttributes>>;
  patch(
    args: PatchCaseConfigureArgs
  ): Promise<SavedObjectsUpdateResponse<ESCasesConfigureAttributes>>;
  post(args: PostCaseConfigureArgs): Promise<SavedObject<ESCasesConfigureAttributes>>;
}

export class CaseConfigureService {
  constructor(private readonly log: Logger) {}
  public setup = async (): Promise<CaseConfigureServiceSetup> => ({
    delete: async ({ client, caseConfigureId }: GetCaseConfigureArgs) => {
      try {
        this.log.debug(`Attempting to DELETE case configure ${caseConfigureId}`);
        return await client.delete(CASE_CONFIGURE_SAVED_OBJECT, caseConfigureId);
      } catch (error) {
        this.log.debug(`Error on DELETE case configure ${caseConfigureId}: ${error}`);
        throw error;
      }
    },
    get: async ({ client, caseConfigureId }: GetCaseConfigureArgs) => {
      try {
        this.log.debug(`Attempting to GET case configuration ${caseConfigureId}`);
        return await client.get(CASE_CONFIGURE_SAVED_OBJECT, caseConfigureId);
      } catch (error) {
        this.log.debug(`Error on GET case configuration ${caseConfigureId}: ${error}`);
        throw error;
      }
    },
    find: async ({ client, options }: FindCaseConfigureArgs) => {
      try {
        this.log.debug(`Attempting to find all case configuration`);
        return await client.find({ ...options, type: CASE_CONFIGURE_SAVED_OBJECT });
      } catch (error) {
        this.log.debug(`Attempting to find all case configuration`);
        throw error;
      }
    },
    post: async ({ client, attributes }: PostCaseConfigureArgs) => {
      try {
        this.log.debug(`Attempting to POST a new case configuration`);
        return await client.create(CASE_CONFIGURE_SAVED_OBJECT, { ...attributes });
      } catch (error) {
        this.log.debug(`Error on POST a new case configuration: ${error}`);
        throw error;
      }
    },
    patch: async ({ client, caseConfigureId, updatedAttributes }: PatchCaseConfigureArgs) => {
      try {
        this.log.debug(`Attempting to UPDATE case configuration ${caseConfigureId}`);
        return await client.update(CASE_CONFIGURE_SAVED_OBJECT, caseConfigureId, {
          ...updatedAttributes,
        });
      } catch (error) {
        this.log.debug(`Error on UPDATE case configuration ${caseConfigureId}: ${error}`);
        throw error;
      }
    },
  });
}
