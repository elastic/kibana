/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/require_kbn_fs
import { writeFileSync } from 'fs';
import { ToolingLog } from '@kbn/tooling-log';
import { run, cleanup } from './run';
import type { ForgeConfig, ForgeOutput } from './types';

const DEFAULT_RESOURCE_PREFIX = 'scalability-test';

function parseIntEnv(envVar: string, defaultValue: number): number {
  const value = process.env[envVar];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getConfigFromEnv(): ForgeConfig {
  const kibanaUrl = process.env.KIBANA_URL || 'http://localhost:5601';
  const resourcePrefix = process.env.RESOURCE_PREFIX || DEFAULT_RESOURCE_PREFIX;

  return {
    kibanaUrl,
    username: process.env.KIBANA_USERNAME || 'elastic',
    password: process.env.KIBANA_PASSWORD || 'changeme',
    spaceId: resourcePrefix,
    resourcePrefix,
    concurrency: parseIntEnv('CONCURRENCY', 1),
    monitorCounts: {
      http: parseIntEnv('HTTP', 1),
      tcp: parseIntEnv('TCP', 1),
      icmp: parseIntEnv('ICMP', 1),
      browser: parseIntEnv('BROWSER', 1),
    },
    // Optional: use existing private location (skip creating agent policy + private location)
    privateLocationId: process.env.PRIVATE_LOCATION_ID || undefined,
  };
}

function writeOutputFile(output: ForgeOutput, log: ToolingLog): void {
  const outputFile = process.env.OUTPUT_FILE;
  if (outputFile) {
    writeFileSync(outputFile, JSON.stringify(output, null, 2));
    log.info(`Output written to: ${outputFile}`);
  }
}

export async function cli(): Promise<void> {
  const log = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });

  const action = process.env.FORGE_ACTION || process.argv[2] || 'create';
  const config = getConfigFromEnv();

  try {
    switch (action) {
      case 'create':
        const output = await run(config, log);
        log.info(`Enrollment Token: ${output.enrollmentToken}`);
        log.info(`Kibana Version: ${output.kibanaVersion}`);
        log.info(`Total Monitors: ${output.monitorCount}`);
        writeOutputFile(output, log);
        break;

      case 'cleanup':
        await cleanup(config, log);
        break;

      default:
        log.error(`Unknown action: ${action}. Use 'create' or 'cleanup'`);
        process.exitCode = 1;
    }
  } catch (error) {
    log.error('Synthetics Forge failed');
    log.error(error as Error);
    process.exitCode = 1;
  }
}
