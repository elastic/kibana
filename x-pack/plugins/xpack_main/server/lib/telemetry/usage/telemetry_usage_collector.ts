/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { accessSync, constants, promises, statSync } from 'fs';
import { Server } from 'hapi';
import { find } from 'lodash';
import { safeLoad } from 'js-yaml';

// look for telemetry.yml in the same places we expect kibana.yml
import { createConfigPaths } from '../../../../../../../src/legacy/server/path/create_config_path';
import { ensureDeepObject } from '../../../../../../../src/core/server/config/ensure_deep_object';

/**
 * Paths expected to contain the file.
 */
const USAGE_PATHS: string[] = createConfigPaths('telemetry.yml');

/**
 * The maximum file size before we ignore it (note: this limit is arbitrary).
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 KB

export interface KibanaHapiServer extends Server {
  usage: {
    collectorSet: {
      makeUsageCollector: (collector: object) => any;
    };
  };
}

/**
 * Find the first path from the supplied `paths` that is readable.
 *
 * @param {Array} paths The possible paths where a config file may exist.
 * @returns The first matching path, or `undefined`.
 */
export function findFirstReadableFile(paths: string[]): string | undefined {
  return find(paths, path => {
    try {
      accessSync(path, constants.R_OK);

      // ignore files above the limit
      const stats = statSync(path);
      return stats.size <= MAX_FILE_SIZE;
    } catch (e) {
      // Check the next path
    }
  });
}

/**
 * Load the `telemetry.yml` file, if it exists, and return its contents as
 * a JSON object.
 *
 * @param _callCluster The unneeded parameter passed to every collector fetch method.
 * @param paths Defaults to `USAGE_PATHS`, but overridable for testing.
 * @returns The unmodified JSON object if the file exists and is a valid YAML file.
 */
export async function readTelemetryFile(
  _callCluster: any,
  paths: string[] = USAGE_PATHS
): Promise<object | undefined> {
  try {
    const path = findFirstReadableFile(paths);

    if (path) {
      const yaml = await promises.readFile(path);
      const data = safeLoad(yaml.toString());

      // don't bother returning empty objects
      if (Object.keys(data).length) {
        // ensure { "a.b": "value" } becomes { "a": { "b": "value" } }
        return ensureDeepObject(data);
      }
    }
  } catch (e) {
    // ignored
  }

  return undefined;
}

/**
 * Create a usage collector that provides the `telemetry.yml` data as a
 * `static_telemetry` object.
 *
 * Loading of the file is done lazily and on-demand. This avoids hanging
 * onto the data in memory unnecessarily, as well as allows it to be
 * updated out-of-process without having to restart Kibana.
 *
 * @param server The Kibana server instance.
 * @return `UsageCollector` that provides the `static_telemetry` described.
 */
export function createTelemetryUsageCollector(server: KibanaHapiServer) {
  return server.usage.collectorSet.makeUsageCollector({
    type: 'static_telemetry',
    fetch: readTelemetryFile,
  });
}
