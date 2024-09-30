/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold, map } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { failure } from 'io-ts/lib/PathReporter';
import { inRange } from 'lodash';
import {
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import type { MetricsDataClient } from '@kbn/metrics-data-access-plugin/server';
import {
  InfraSavedSourceConfiguration,
  InfraSource,
  InfraSourceConfiguration,
  InfraStaticSourceConfiguration,
} from '../../../common/source_configuration/source_configuration';
import { SourceConfigurationSavedObjectRT } from '.';
import { defaultSourceConfiguration } from './defaults';
import { AnomalyThresholdRangeError } from './errors';
import {
  extractSavedObjectReferences,
  resolveSavedObjectReferences,
} from './saved_object_references';
import { infraSourceConfigurationSavedObjectName } from './saved_object_type';

interface InfraSourcesParams {
  metricsClient: MetricsDataClient;
}

// extract public interface
export type IInfraSources = Pick<InfraSources, keyof InfraSources>;

export class InfraSources {
  private readonly metricsClient: MetricsDataClient;

  constructor(params: InfraSourcesParams) {
    this.metricsClient = params.metricsClient;
  }

  public async getInfraSourceConfiguration(
    savedObjectsClient: SavedObjectsClientContract,
    sourceId: string
  ): Promise<InfraSource> {
    const savedSourceConfiguration = await this.getSavedSourceConfiguration(
      savedObjectsClient,
      sourceId
    )
      .then((result) => ({
        ...result,
        configuration: mergeSourceConfiguration(defaultSourceConfiguration, result.configuration),
      }))
      .catch((err) =>
        SavedObjectsErrorHelpers.isNotFoundError(err)
          ? Promise.resolve({
              id: sourceId,
              version: undefined,
              updatedAt: undefined,
              origin: 'fallback' as 'fallback',
              configuration: defaultSourceConfiguration,
            })
          : Promise.reject(err)
      );

    return savedSourceConfiguration;
  }

  public async getSourceConfiguration(
    savedObjectsClient: SavedObjectsClientContract,
    sourceId: string
  ): Promise<InfraSource> {
    const sourceConfiguration = await this.getInfraSourceConfiguration(
      savedObjectsClient,
      sourceId
    );
    const metricAlias = await this.metricsClient.getMetricIndices({
      savedObjectsClient,
    });
    sourceConfiguration.configuration.metricAlias = metricAlias;
    return sourceConfiguration;
  }

  public async createSourceConfiguration(
    savedObjectsClient: SavedObjectsClientContract,
    sourceId: string,
    source: InfraSavedSourceConfiguration
  ) {
    const { anomalyThreshold } = source;
    if (anomalyThreshold && !inRange(anomalyThreshold, 0, 101))
      throw new AnomalyThresholdRangeError('Anomaly threshold must be 1-100');

    const newSourceConfiguration = mergeSourceConfiguration(defaultSourceConfiguration, source);
    const { attributes, references } = extractSavedObjectReferences(newSourceConfiguration);

    const createdSourceConfiguration = convertSavedObjectToSavedSourceConfiguration(
      await savedObjectsClient.create(infraSourceConfigurationSavedObjectName, attributes, {
        id: sourceId,
        references,
      })
    );

    await this.metricsClient.updateMetricIndices({
      savedObjectsClient,
      metricIndices: newSourceConfiguration.metricAlias,
    });

    return {
      ...createdSourceConfiguration,
      configuration: mergeSourceConfiguration(
        defaultSourceConfiguration,
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
    const { anomalyThreshold } = sourceProperties;

    if (anomalyThreshold && !inRange(anomalyThreshold, 0, 101))
      throw new AnomalyThresholdRangeError('Anomaly threshold must be 1-100');

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

    await this.metricsClient.updateMetricIndices({
      savedObjectsClient,
      metricIndices: updatedSourceConfiguration.configuration.metricAlias!,
    });

    return {
      ...updatedSourceConfiguration,
      configuration: mergeSourceConfiguration(
        defaultSourceConfiguration,
        updatedSourceConfiguration.configuration
      ),
    };
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
}

export const mergeSourceConfiguration = (
  first: InfraSourceConfiguration,
  ...others: InfraStaticSourceConfiguration[]
) =>
  others.reduce<InfraSourceConfiguration>(
    (previousSourceConfiguration, currentSourceConfiguration) => ({
      ...previousSourceConfiguration,
      ...currentSourceConfiguration,
    }),
    first
  );

export const convertSavedObjectToSavedSourceConfiguration = (savedObject: SavedObject<unknown>) =>
  pipe(
    SourceConfigurationSavedObjectRT.decode(savedObject),
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
