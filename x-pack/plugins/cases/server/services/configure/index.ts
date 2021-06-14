/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsClientContract } from 'kibana/server';

import { SavedObjectFindOptionsKueryNode } from '../../common';
import { ESCasesConfigureAttributes } from '../../../common/api';
import { CASE_CONFIGURE_SAVED_OBJECT } from '../../../common/constants';

interface ClientArgs {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
}

interface GetCaseConfigureArgs extends ClientArgs {
  configurationId: string;
}
interface FindCaseConfigureArgs extends ClientArgs {
  options?: SavedObjectFindOptionsKueryNode;
}

interface PostCaseConfigureArgs extends ClientArgs {
  attributes: ESCasesConfigureAttributes;
  id: string;
}

interface PatchCaseConfigureArgs extends ClientArgs {
  configurationId: string;
  updatedAttributes: Partial<ESCasesConfigureAttributes>;
}

export class CaseConfigureService {
  constructor(private readonly log: Logger) {}

  public async delete({ unsecuredSavedObjectsClient, configurationId }: GetCaseConfigureArgs) {
    try {
      this.log.debug(`Attempting to DELETE case configure ${configurationId}`);
      return await unsecuredSavedObjectsClient.delete(CASE_CONFIGURE_SAVED_OBJECT, configurationId);
    } catch (error) {
      this.log.debug(`Error on DELETE case configure ${configurationId}: ${error}`);
      throw error;
    }
  }

  public async get({ unsecuredSavedObjectsClient, configurationId }: GetCaseConfigureArgs) {
    try {
      this.log.debug(`Attempting to GET case configuration ${configurationId}`);
      return await unsecuredSavedObjectsClient.get<ESCasesConfigureAttributes>(
        CASE_CONFIGURE_SAVED_OBJECT,
        configurationId
      );
    } catch (error) {
      this.log.debug(`Error on GET case configuration ${configurationId}: ${error}`);
      throw error;
    }
  }

  public async find({ unsecuredSavedObjectsClient, options }: FindCaseConfigureArgs) {
    try {
      this.log.debug(`Attempting to find all case configuration`);
      return await unsecuredSavedObjectsClient.find<ESCasesConfigureAttributes>({
        ...options,
        // Get the latest configuration
        sortField: 'created_at',
        sortOrder: 'desc',
        type: CASE_CONFIGURE_SAVED_OBJECT,
      });
    } catch (error) {
      this.log.debug(`Attempting to find all case configuration`);
      throw error;
    }
  }

  public async post({ unsecuredSavedObjectsClient, attributes, id }: PostCaseConfigureArgs) {
    try {
      this.log.debug(`Attempting to POST a new case configuration`);
      return await unsecuredSavedObjectsClient.create<ESCasesConfigureAttributes>(
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

  public async patch({
    unsecuredSavedObjectsClient,
    configurationId,
    updatedAttributes,
  }: PatchCaseConfigureArgs) {
    try {
      this.log.debug(`Attempting to UPDATE case configuration ${configurationId}`);
      return await unsecuredSavedObjectsClient.update<ESCasesConfigureAttributes>(
        CASE_CONFIGURE_SAVED_OBJECT,
        configurationId,
        {
          ...updatedAttributes,
        }
      );
    } catch (error) {
      this.log.debug(`Error on UPDATE case configuration ${configurationId}: ${error}`);
      throw error;
    }
  }
}
