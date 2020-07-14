/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as runtimeTypes from 'io-ts';
import { failure } from 'io-ts/lib/PathReporter';
import { identity, constant } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, fold } from 'fp-ts/lib/Either';
import { SavedObjectsClientContract } from 'src/core/server';
import { defaultSourceConfiguration } from './defaults';
import { NotFoundError } from './errors';
import { infraSourceConfigurationSavedObjectName } from './saved_object_type';
import {
  InfraSavedSourceConfiguration,
  InfraSourceConfiguration,
  InfraStaticSourceConfiguration,
  pickSavedSourceConfiguration,
  SourceConfigurationSavedObjectRuntimeType,
  StaticSourceConfigurationRuntimeType,
  InfraSource,
} from '../../../common/http_api/source_api';
import { InfraConfig } from '../../../server';

interface Libs {
  config: InfraConfig;
}

export class InfraSources {
  private internalSourceConfigurations: Map<string, InfraStaticSourceConfiguration> = new Map();
  private readonly libs: Libs;

  constructor(libs: Libs) {
    this.libs = libs;
  }

  public async getSourceConfiguration(
    savedObjectsClient: SavedObjectsClientContract,
    sourceId: string
  ): Promise<InfraSource> {
    const staticDefaultSourceConfiguration = await this.getStaticDefaultSourceConfiguration();
    const savedSourceConfiguration = await this.getInternalSourceConfiguration(sourceId)
      .then((internalSourceConfiguration) => ({
        id: sourceId,
        version: undefined,
        updatedAt: undefined,
        origin: 'internal' as 'internal',
        configuration: mergeSourceConfiguration(
          staticDefaultSourceConfiguration,
          internalSourceConfiguration
        ),
      }))
      .catch((err) =>
        err instanceof NotFoundError
          ? this.getSavedSourceConfiguration(savedObjectsClient, sourceId).then((result) => ({
              ...result,
              configuration: mergeSourceConfiguration(
                staticDefaultSourceConfiguration,
                result.configuration
              ),
            }))
          : Promise.reject(err)
      )
      .catch((err) =>
        savedObjectsClient.errors.isNotFoundError(err)
          ? Promise.resolve({
              id: sourceId,
              version: undefined,
              updatedAt: undefined,
              origin: 'fallback' as 'fallback',
              configuration: staticDefaultSourceConfiguration,
            })
          : Promise.reject(err)
      );

    return savedSourceConfiguration;
  }

  public async getAllSourceConfigurations(savedObjectsClient: SavedObjectsClientContract) {
    const staticDefaultSourceConfiguration = await this.getStaticDefaultSourceConfiguration();

    const savedSourceConfigurations = await this.getAllSavedSourceConfigurations(
      savedObjectsClient
    );

    return savedSourceConfigurations.map((savedSourceConfiguration) => ({
      ...savedSourceConfiguration,
      configuration: mergeSourceConfiguration(
        staticDefaultSourceConfiguration,
        savedSourceConfiguration.configuration
      ),
    }));
  }

  public async createSourceConfiguration(
    savedObjectsClient: SavedObjectsClientContract,
    sourceId: string,
    source: InfraSavedSourceConfiguration
  ) {
    const staticDefaultSourceConfiguration = await this.getStaticDefaultSourceConfiguration();

    const newSourceConfiguration = mergeSourceConfiguration(
      staticDefaultSourceConfiguration,
      source
    );

    const createdSourceConfiguration = convertSavedObjectToSavedSourceConfiguration(
      await savedObjectsClient.create(
        infraSourceConfigurationSavedObjectName,
        pickSavedSourceConfiguration(newSourceConfiguration) as any,
        { id: sourceId }
      )
    );

    return {
      ...createdSourceConfiguration,
      configuration: mergeSourceConfiguration(
        staticDefaultSourceConfiguration,
        createdSourceConfiguration.configuration
      ),
    };
  }

  public async deleteSourceConfiguration(
    savedObjectsClient: SavedObjectsClientContract,
    sourceId: string
  ) {
    await savedObjectsClient.delete(infraSourceConfigurationSavedObjectName, sourceId);
  }

  public async updateSourceConfiguration(
    savedObjectsClient: SavedObjectsClientContract,
    sourceId: string,
    sourceProperties: InfraSavedSourceConfiguration
  ) {
    const staticDefaultSourceConfiguration = await this.getStaticDefaultSourceConfiguration();

    const { configuration, version } = await this.getSourceConfiguration(
      savedObjectsClient,
      sourceId
    );

    const updatedSourceConfigurationAttributes = mergeSourceConfiguration(
      configuration,
      sourceProperties
    );

    const updatedSourceConfiguration = convertSavedObjectToSavedSourceConfiguration(
      await savedObjectsClient.update(
        infraSourceConfigurationSavedObjectName,
        sourceId,
        pickSavedSourceConfiguration(updatedSourceConfigurationAttributes) as any,
        {
          version,
        }
      )
    );

    return {
      ...updatedSourceConfiguration,
      configuration: mergeSourceConfiguration(
        staticDefaultSourceConfiguration,
        updatedSourceConfiguration.configuration
      ),
    };
  }

  public async defineInternalSourceConfiguration(
    sourceId: string,
    sourceProperties: InfraStaticSourceConfiguration
  ) {
    this.internalSourceConfigurations.set(sourceId, sourceProperties);
  }

  public async getInternalSourceConfiguration(sourceId: string) {
    const internalSourceConfiguration = this.internalSourceConfigurations.get(sourceId);

    if (!internalSourceConfiguration) {
      throw new NotFoundError(
        `Failed to load internal source configuration: no configuration "${sourceId}" found.`
      );
    }

    return internalSourceConfiguration;
  }

  private async getStaticDefaultSourceConfiguration() {
    const staticSourceConfiguration = pipe(
      runtimeTypes
        .type({
          sources: runtimeTypes.type({
            default: StaticSourceConfigurationRuntimeType,
          }),
        })
        .decode(this.libs.config),
      map(({ sources: { default: defaultConfiguration } }) => defaultConfiguration),
      fold(constant({}), identity)
    );

    return mergeSourceConfiguration(defaultSourceConfiguration, staticSourceConfiguration);
  }

  private async getSavedSourceConfiguration(
    savedObjectsClient: SavedObjectsClientContract,
    sourceId: string
  ) {
    const savedObject = await savedObjectsClient.get(
      infraSourceConfigurationSavedObjectName,
      sourceId
    );

    return convertSavedObjectToSavedSourceConfiguration(savedObject);
  }

  private async getAllSavedSourceConfigurations(savedObjectsClient: SavedObjectsClientContract) {
    const savedObjects = await savedObjectsClient.find({
      type: infraSourceConfigurationSavedObjectName,
    });

    return savedObjects.saved_objects.map(convertSavedObjectToSavedSourceConfiguration);
  }
}

const mergeSourceConfiguration = (
  first: InfraSourceConfiguration,
  ...others: InfraStaticSourceConfiguration[]
) =>
  others.reduce<InfraSourceConfiguration>(
    (previousSourceConfiguration, currentSourceConfiguration) => ({
      ...previousSourceConfiguration,
      ...currentSourceConfiguration,
      fields: {
        ...previousSourceConfiguration.fields,
        ...currentSourceConfiguration.fields,
      },
    }),
    first
  );

export const convertSavedObjectToSavedSourceConfiguration = (savedObject: unknown) =>
  pipe(
    SourceConfigurationSavedObjectRuntimeType.decode(savedObject),
    map((savedSourceConfiguration) => ({
      id: savedSourceConfiguration.id,
      version: savedSourceConfiguration.version,
      updatedAt: savedSourceConfiguration.updated_at,
      origin: 'stored' as 'stored',
      configuration: savedSourceConfiguration.attributes,
    })),
    fold((errors) => {
      throw new Error(failure(errors).join('\n'));
    }, identity)
  );
