/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsClientContract } from 'kibana/server';

import { ESCasesConfigureAttributes, SavedObjectFindOptions } from '../../../common/api';
import { CASE_CONFIGURE_SAVED_OBJECT } from '../../../common/constants';

interface ClientArgs {
  soClient: SavedObjectsClientContract;
}

interface GetCaseConfigureArgs extends ClientArgs {
  caseConfigureId: string;
}
interface FindCaseConfigureArgs extends ClientArgs {
  options?: SavedObjectFindOptions;
}

interface PostCaseConfigureArgs extends ClientArgs {
  attributes: ESCasesConfigureAttributes;
  id: string;
}

interface PatchCaseConfigureArgs extends ClientArgs {
  caseConfigureId: string;
  updatedAttributes: Partial<ESCasesConfigureAttributes>;
}

export class CaseConfigureService {
  constructor(private readonly log: Logger) {}

  public async delete({ soClient, caseConfigureId }: GetCaseConfigureArgs) {
    try {
      this.log.debug(`Attempting to DELETE case configure ${caseConfigureId}`);
      return await soClient.delete(CASE_CONFIGURE_SAVED_OBJECT, caseConfigureId);
    } catch (error) {
      this.log.debug(`Error on DELETE case configure ${caseConfigureId}: ${error}`);
      throw error;
    }
  }

  public async get({ soClient, caseConfigureId }: GetCaseConfigureArgs) {
    try {
      this.log.debug(`Attempting to GET case configuration ${caseConfigureId}`);
      return await soClient.get<ESCasesConfigureAttributes>(
        CASE_CONFIGURE_SAVED_OBJECT,
        caseConfigureId
      );
    } catch (error) {
      this.log.debug(`Error on GET case configuration ${caseConfigureId}: ${error}`);
      throw error;
    }
  }

  public async find({ soClient, options }: FindCaseConfigureArgs) {
    try {
      this.log.debug(`Attempting to find all case configuration`);
      return await soClient.find<ESCasesConfigureAttributes>({
        ...options,
        type: CASE_CONFIGURE_SAVED_OBJECT,
      });
    } catch (error) {
      this.log.debug(`Attempting to find all case configuration`);
      throw error;
    }
  }

  public async post({ soClient, attributes, id }: PostCaseConfigureArgs) {
    try {
      this.log.debug(`Attempting to POST a new case configuration`);
      return await soClient.create<ESCasesConfigureAttributes>(
        CASE_CONFIGURE_SAVED_OBJECT,
        {
          ...attributes,
        },
        { id }
      );
    } catch (error) {
      this.log.debug(`Error on POST a new case configuration: ${error}`);
      throw error;
    }
  }

  public async patch({ soClient, caseConfigureId, updatedAttributes }: PatchCaseConfigureArgs) {
    try {
      this.log.debug(`Attempting to UPDATE case configuration ${caseConfigureId}`);
      return await soClient.update<ESCasesConfigureAttributes>(
        CASE_CONFIGURE_SAVED_OBJECT,
        caseConfigureId,
        {
          ...updatedAttributes,
        }
      );
    } catch (error) {
      this.log.debug(`Error on UPDATE case configuration ${caseConfigureId}: ${error}`);
      throw error;
    }
  }
}
