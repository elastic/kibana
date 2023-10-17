/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { isError } from 'lodash';

export async function installKibanaAssets({
  filePath,
  logger,
  soClient,
}: {
  filePath: string;
  logger: Logger;
  soClient: SavedObjectsClientContract;
}) {
  try {
    try {
      // Read the NDJSON file synchronously and parse it into an object
      const ndjsonData = fs.readFileSync(filePath, 'utf8').split('\n');

      const objects = [];
      for (const line of ndjsonData) {
        if (line.trim() === '') continue; // Skip empty lines

        try {
          const parsedObject = JSON.parse(line);
          objects.push(parsedObject);
        } catch (error) {
          logger.error('Error parsing JSON:', error);
        }
      }

      await soClient.bulkCreate(objects, { overwrite: true });

      logger.info(`Imported  saved objects from "${filePath}"`);
    } catch (error) {
      logger.error('Error reading or parsing JSON file:', error);
    }
  } catch (error) {
    if (isError(error)) {
      logger.error(
        `Error importing saved objects from "${filePath}" into Kibana: ${error.message}`
      );
    }
    throw error;
  }
}
