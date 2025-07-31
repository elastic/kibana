/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSourceType, DataSourceDefinition } from './types';
import { AppLogger } from '../../utils';

export class DataSourcesRegistry {
  private allowRegistration = true;
  private dataSources = new Map<DataSourceType, DataSourceDefinition>();

  constructor() {
    AppLogger.getInstance().info('DataSourcesRegistry: Initialized');
  }

  register(definition: DataSourceDefinition) {
    const logger = AppLogger.getInstance();
    logger.info(
      `DataSourcesRegistry: Attempting to register data source: ${definition.name} (type: ${definition.type})`
    );

    if (!this.allowRegistration) {
      const error = `Tried to register data source ${definition.name} but allowRegistration is false`;
      logger.error(`DataSourcesRegistry: ${error}`);
      throw new Error(error);
    }

    if (this.has(definition.type)) {
      const error = `Tried to register data source [${definition.type}], but already registered`;
      logger.error(`DataSourcesRegistry: ${error}`);
      throw new Error(error);
    }

    this.dataSources.set(definition.type, definition);
    logger.info(
      `DataSourcesRegistry: Successfully registered data source: ${definition.name}. Total registered: ${this.dataSources.size}`
    );
  }

  blockRegistration() {
    const logger = AppLogger.getInstance();
    logger.info(
      `DataSourcesRegistry: Blocking further registrations. Current count: ${this.dataSources.size}`
    );
    this.allowRegistration = false;
  }

  has(type: DataSourceType) {
    return this.dataSources.has(type);
  }

  get(type: DataSourceType) {
    if (!this.has(type)) {
      throw new Error(`Data source definition for type [${type}] not found`);
    }
    return this.dataSources.get(type)!;
  }

  getAll() {
    const logger = AppLogger.getInstance();
    const allSources = [...this.dataSources.values()];
    logger.info(
      `DataSourcesRegistry: getAll() called, returning ${allSources.length} data sources`
    );
    allSources.forEach((source, index) => {
      logger.info(`  ${index + 1}. ${source.name} (${source.type}) - ${source.provider}`);
    });
    return allSources;
  }

  getUIConfig(type: DataSourceType) {
    const logger = AppLogger.getInstance();
    logger.info(`DataSourcesRegistry: Getting UI config for type: ${type}`);

    if (!this.has(type)) {
      const error = `Data source definition for type [${type}] not found`;
      logger.error(`DataSourcesRegistry: ${error}`);
      throw new Error(error);
    }

    const definition = this.dataSources.get(type)!;
    logger.info(
      `DataSourcesRegistry: Found UI config for ${definition.name}: ${JSON.stringify(
        definition.uiConfig
      )}`
    );

    return definition.uiConfig;
  }
}
