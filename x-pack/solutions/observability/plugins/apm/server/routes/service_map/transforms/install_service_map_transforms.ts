/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { DefaultServiceMapTransformManager } from './service_map_transform_manager';
import { createServiceMapIndexTemplates } from './create_service_map_indices';

interface InstallServiceMapTransformsParams {
  scopedClusterClient: IScopedClusterClient;
  logger: Logger;
  apmIndices: APMIndices;
}

/**
 * Installs and starts the service map transforms.
 *
 * This should be called from an API route with the user's scoped cluster client.
 * The user must have permissions to:
 * - Read from APM source indices (traces-apm*, etc.)
 * - Create index templates and indices
 * - Manage transforms
 *
 * Example usage in a route handler:
 *
 * ```typescript
 * const handler = async (resources) => {
 *   const { context, logger } = resources;
 *   const coreContext = await context.core;
 *   const apmIndices = await getApmIndices();
 *
 *   await installServiceMapTransforms({
 *     scopedClusterClient: coreContext.elasticsearch.client,
 *     logger,
 *     apmIndices,
 *   });
 * };
 * ```
 */
export async function installServiceMapTransforms({
  scopedClusterClient,
  logger,
  apmIndices,
}: InstallServiceMapTransformsParams): Promise<void> {
  const transformLogger = logger.get('service-map-transforms');

  // Log the APM indices configuration for debugging
  transformLogger.debug(`APM indices configuration: ${JSON.stringify(apmIndices)}`);

  try {
    // Create index templates first to ensure proper mappings
    transformLogger.info('Creating service map index templates...');
    await createServiceMapIndexTemplates({
      esClient: scopedClusterClient.asCurrentUser,
      logger: transformLogger,
    });

    // Install transforms
    const manager = new DefaultServiceMapTransformManager(
      scopedClusterClient,
      transformLogger,
      apmIndices
    );

    transformLogger.info('Installing service map transforms...');
    await manager.install();

    transformLogger.info('Starting service map transforms...');
    // Start transforms without blocking - they will run asynchronously
    manager.start().catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      transformLogger.error(`Failed to start service map transforms: ${msg}`);
    });

    transformLogger.info('Service map transforms installed successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    transformLogger.error(`Failed to setup service map transforms: ${message}`);
    throw error;
  }
}

/**
 * Gets the current status of service map transforms.
 */
export async function getServiceMapTransformsStatus({
  scopedClusterClient,
  logger,
  apmIndices,
}: InstallServiceMapTransformsParams) {
  const manager = new DefaultServiceMapTransformManager(scopedClusterClient, logger, apmIndices);
  return manager.getStatus();
}

interface UninstallServiceMapTransformsParams extends InstallServiceMapTransformsParams {
  /** Also delete index templates and indices. Defaults to false. */
  deleteIndices?: boolean;
}

/**
 * Stops and uninstalls the service map transforms.
 * Use this for cleanup or when disabling the feature.
 */
export async function uninstallServiceMapTransforms({
  scopedClusterClient,
  logger,
  apmIndices,
  deleteIndices = false,
}: UninstallServiceMapTransformsParams): Promise<void> {
  const transformLogger = logger.get('service-map-transforms');
  const manager = new DefaultServiceMapTransformManager(
    scopedClusterClient,
    transformLogger,
    apmIndices
  );

  try {
    transformLogger.info('Stopping service map transforms...');
    await manager.stop();

    transformLogger.info('Uninstalling service map transforms...');
    await manager.uninstall();

    if (deleteIndices) {
      transformLogger.info('Deleting service map index templates and indices...');
      const { deleteServiceMapIndexTemplates } = await import('./create_service_map_indices');
      await deleteServiceMapIndexTemplates({
        esClient: scopedClusterClient.asCurrentUser,
        logger: transformLogger,
        deleteIndices: true,
      });
    }

    transformLogger.info('Service map transforms uninstalled successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    transformLogger.error(`Failed to uninstall service map transforms: ${message}`);
    throw error;
  }
}
