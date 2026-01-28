/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import {
  SERVICE_MAP_EDGES_TRANSFORM_ID,
  SERVICE_MAP_ENTRY_POINTS_TRANSFORM_ID,
  SERVICE_MAP_TRANSFORM_VERSION,
} from './constants';
import { getServiceMapEdgesTransformParams } from './service_map_edges_transform';
import { getServiceEntryPointsTransformParams } from './service_entry_points_transform';

type TransformId = string;

export interface ServiceMapTransformManager {
  install(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  uninstall(): Promise<void>;
  getStatus(): Promise<ServiceMapTransformStatus>;
}

export interface ServiceMapTransformStatus {
  edges: TransformStatus;
  entryPoints: TransformStatus;
}

export interface TransformStatus {
  installed: boolean;
  running: boolean;
  version?: number;
  documentsProcessed?: number;
  lastCheckpoint?: string;
}

/**
 * Manages service map transforms using the current user's credentials.
 * Uses scopedClusterClient.asCurrentUser to run transforms with the
 * calling user's permissions.
 */
export class DefaultServiceMapTransformManager implements ServiceMapTransformManager {
  constructor(
    private scopedClusterClient: IScopedClusterClient,
    private logger: Logger,
    private apmIndices: APMIndices
  ) {}

  async install(): Promise<void> {
    await Promise.all([
      this.installTransform(getServiceMapEdgesTransformParams(this.apmIndices)),
      this.installTransform(getServiceEntryPointsTransformParams(this.apmIndices)),
    ]);
  }

  async start(): Promise<void> {
    await Promise.all([
      this.startTransform(SERVICE_MAP_EDGES_TRANSFORM_ID),
      this.startTransform(SERVICE_MAP_ENTRY_POINTS_TRANSFORM_ID),
    ]);
  }

  async stop(): Promise<void> {
    await Promise.all([
      this.stopTransform(SERVICE_MAP_EDGES_TRANSFORM_ID),
      this.stopTransform(SERVICE_MAP_ENTRY_POINTS_TRANSFORM_ID),
    ]);
  }

  async uninstall(): Promise<void> {
    await Promise.all([
      this.uninstallTransform(SERVICE_MAP_EDGES_TRANSFORM_ID),
      this.uninstallTransform(SERVICE_MAP_ENTRY_POINTS_TRANSFORM_ID),
    ]);
  }

  async getStatus(): Promise<ServiceMapTransformStatus> {
    const [edges, entryPoints] = await Promise.all([
      this.getTransformStatus(SERVICE_MAP_EDGES_TRANSFORM_ID),
      this.getTransformStatus(SERVICE_MAP_ENTRY_POINTS_TRANSFORM_ID),
    ]);

    return { edges, entryPoints };
  }

  private async installTransform(transformParams: TransformPutTransformRequest): Promise<void> {
    const transformId = transformParams.transform_id;

    try {
      // Log transform params for debugging
      this.logger.debug(
        `Installing transform [${transformId}] with source indices: ${JSON.stringify(
          transformParams.source?.index
        )}`
      );

      // Check if transform already exists
      const existingVersion = await this.getTransformVersion(transformId);

      if (existingVersion !== undefined) {
        if (existingVersion >= SERVICE_MAP_TRANSFORM_VERSION) {
          this.logger.debug(
            `Service map transform [${transformId}] already exists with version ${existingVersion}, skipping installation`
          );
          return;
        }

        // Newer version needed - stop, delete, and recreate
        this.logger.info(
          `Upgrading service map transform [${transformId}] from version ${existingVersion} to ${SERVICE_MAP_TRANSFORM_VERSION}`
        );
        await this.stopTransform(transformId);
        await this.uninstallTransform(transformId);
      }

      this.logger.debug(`Calling putTransform for [${transformId}]`);
      await this.scopedClusterClient.asCurrentUser.transform.putTransform({
        transform_id: transformParams.transform_id,
        description: transformParams.description,
        source: transformParams.source,
        dest: transformParams.dest,
        pivot: transformParams.pivot,
        sync: transformParams.sync,
        frequency: transformParams.frequency,
        settings: transformParams.settings,
        _meta: transformParams._meta,
        defer_validation: true, // Query parameter - defer validation until transform starts
      });
      this.logger.info(`Service map transform [${transformId}] installed successfully`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : '';
      this.logger.error(`Failed to install service map transform [${transformId}]: ${message}`);
      this.logger.debug(`Transform install error stack: ${stack}`);
      throw err;
    }
  }

  private async startTransform(transformId: TransformId): Promise<void> {
    try {
      await this.scopedClusterClient.asCurrentUser.transform.startTransform(
        { transform_id: transformId },
        { ignore: [409] } // Ignore already started
      );

      // Schedule immediate execution
      this.scopedClusterClient.asCurrentUser.transform
        .scheduleNowTransform({ transform_id: transformId })
        .catch((e) => {
          this.logger.debug(`Failed to schedule immediate execution for [${transformId}]: ${e}`);
        });

      this.logger.info(`Service map transform [${transformId}] started`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to start service map transform [${transformId}]: ${message}`);
      throw err;
    }
  }

  private async stopTransform(transformId: TransformId): Promise<void> {
    try {
      await this.scopedClusterClient.asCurrentUser.transform.stopTransform(
        {
          transform_id: transformId,
          wait_for_completion: true,
          force: true,
          allow_no_match: true,
        },
        { ignore: [404] }
      );
      this.logger.info(`Service map transform [${transformId}] stopped`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to stop service map transform [${transformId}]: ${message}`);
      throw err;
    }
  }

  private async uninstallTransform(transformId: TransformId): Promise<void> {
    try {
      await this.scopedClusterClient.asCurrentUser.transform.deleteTransform(
        { transform_id: transformId, force: true },
        { ignore: [404] }
      );
      this.logger.info(`Service map transform [${transformId}] uninstalled`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to uninstall service map transform [${transformId}]: ${message}`);
      throw err;
    }
  }

  private async getTransformVersion(transformId: TransformId): Promise<number | undefined> {
    try {
      const response = await this.scopedClusterClient.asCurrentUser.transform.getTransform(
        { transform_id: transformId },
        { ignore: [404] }
      );

      // Handle case where transform doesn't exist (404 ignored)
      if (!response || !response.transforms || response.transforms.length === 0) {
        return undefined;
      }

      return response.transforms[0]._meta?.version as number | undefined;
    } catch (err) {
      // Check for resource not found error
      const esError = err as { meta?: { body?: { error?: { type?: string } } } };
      if (esError.meta?.body?.error?.type === 'resource_not_found_exception') {
        return undefined;
      }
      throw err;
    }
  }

  private async getTransformStatus(transformId: TransformId): Promise<TransformStatus> {
    try {
      const [transformResponse, statsResponse] = await Promise.all([
        this.scopedClusterClient.asCurrentUser.transform.getTransform(
          { transform_id: transformId },
          { ignore: [404] }
        ),
        this.scopedClusterClient.asCurrentUser.transform.getTransformStats(
          { transform_id: transformId },
          { ignore: [404] }
        ),
      ]);

      // Handle case where transform doesn't exist (404 ignored)
      if (
        !transformResponse ||
        !transformResponse.transforms ||
        transformResponse.transforms.length === 0
      ) {
        return { installed: false, running: false };
      }

      const transform = transformResponse.transforms[0];
      const stats = statsResponse?.transforms?.[0];

      const lastCheckpointTimestamp = stats?.checkpointing?.last?.timestamp;

      return {
        installed: true,
        running: stats?.state === 'started' || stats?.state === 'indexing',
        version: transform._meta?.version as number | undefined,
        documentsProcessed: stats?.stats?.documents_processed,
        lastCheckpoint:
          lastCheckpointTimestamp != null ? String(lastCheckpointTimestamp) : undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to get status for transform [${transformId}]: ${message}`);
      return { installed: false, running: false };
    }
  }
}
