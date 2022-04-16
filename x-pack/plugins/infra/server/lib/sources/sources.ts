/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold, map } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { failure } from 'io-ts/lib/PathReporter';
import { inRange } from 'lodash';
import { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import {
  InfraSavedSourceConfiguration,
  InfraSource,
  InfraSourceConfiguration,
  InfraStaticSourceConfiguration,
  SourceConfigurationConfigFileProperties,
  sourceConfigurationConfigFilePropertiesRT,
  SourceConfigurationSavedObjectRuntimeType,
} from '../../../common/source_configuration/source_configuration';
import { InfraConfig } from '../..';
import { defaultSourceConfiguration } from './defaults';
import { AnomalyThresholdRangeError, NotFoundError } from './errors';
import {
  extractSavedObjectReferences,
  resolveSavedObjectReferences,
} from './saved_object_references';
import { infraSourceConfigurationSavedObjectName } from './saved_object_type';

interface Libs {
  config: InfraConfig;
}

// extract public interface
export type IInfraSources = Pick<InfraSources, keyof InfraSources>;

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
    const { anomalyThreshold } = source;
    if (anomalyThreshold && !inRange(anomalyThreshold, 0, 101))
      throw new AnomalyThresholdRangeError('anomalyThreshold must be 1-100');

    const newSourceConfiguration = mergeSourceConfiguration(
      staticDefaultSourceConfiguration,
      source
    );
    const { attributes, references } = extractSavedObjectReferences(newSourceConfiguration);

    const createdSourceConfiguration = convertSavedObjectToSavedSourceConfiguration(
      await savedObjectsClient.create(infraSourceConfigurationSavedObjectName, attributes, {
        id: sourceId,
        references,
      })
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
    const { anomalyThreshold } = sourceProperties;

    if (anomalyThreshold && !inRange(anomalyThreshold, 0, 101))
      throw new AnomalyThresholdRangeError('anomalyThreshold must be 1-100');

    const { configuration, version } = await this.getSourceConfiguration(
      savedObjectsClient,
      sourceId
    );

    const updatedSourceConfigurationAttributes = mergeSourceConfiguration(
      configuration,
      sourceProperties
    );
    const { attributes, references } = extractSavedObjectReferences(
      updatedSourceConfigurationAttributes
    );

    const updatedSourceConfiguration = convertSavedObjectToSavedSourceConfiguration(
      // update() will perform a deep merge. We use create() with overwrite: true instead. mergeSourceConfiguration()
      // ensures the correct and intended merging of properties.
      await savedObjectsClient.create(infraSourceConfigurationSavedObjectName, attributes, {
        id: sourceId,
        overwrite: true,
        references,
        version,
      })
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
    const staticSourceConfiguration: SourceConfigurationConfigFileProperties['sources']['default'] =
      pipe(
        sourceConfigurationConfigFilePropertiesRT.decode(this.libs.config),
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

export const mergeSourceConfiguration = (
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

export const convertSavedObjectToSavedSourceConfiguration = (savedObject: SavedObject<unknown>) =>
  pipe(
    SourceConfigurationSavedObjectRuntimeType.decode(savedObject),
    map((savedSourceConfiguration) => ({
      id: savedSourceConfiguration.id,
      version: savedSourceConfiguration.version,
      updatedAt: savedSourceConfiguration.updated_at,
      origin: 'stored' as 'stored',
      configuration: resolveSavedObjectReferences(
        savedSourceConfiguration.attributes,
        savedObject.references
      ),
    })),
    fold((errors) => {
      throw new Error(failure(errors).join('\n'));
    }, identity)
  );
