/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import axios from 'axios';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { savedObjectsAdapter } from '../../lib/saved_objects';
import { SyntheticsServiceApiKey } from '../../../common/runtime_types';

export const createSyncSyntheticsConfig: UMRestApiRouteFactory = () => ({
  method: 'POST',
  path: API_URLS.SYNC_CONFIG,
  validate: {},
  handler: async ({ savedObjectsClient }): Promise<any> => {
    let apiKey: SyntheticsServiceApiKey;
    try {
      // get api key
      apiKey = await savedObjectsAdapter.getSyntheticsServiceApiKey(savedObjectsClient!);
      // if no api key, set api key
      if (!apiKey) {
        // error
        return;
      }
    } catch (e) {
      throw e;
    }

    try {
      // service doesn't currently take api key, but will need to be passed
      await axios({
        method: 'POST',
        url: 'https://us-central.synthetics.elastic.dev/cronjob',
        data: {
          monitors: [
            {
              type: 'browser',
              name: 'Todos Monitor',
              id: 'todos-monitor',
              schedule: '@every 5m',
              source: {
                zip_url: {
                  url: 'https://github.com/elastic/synthetics/archive/refs/heads/master.zip',
                  folder: 'examples/todos',
                  target_directory: '/tmp/synthetics/suite',
                },
              },
            },
            {
              type: 'browser',
              name: 'Elastic Monitor',
              id: 'elastic-monitor',
              schedule: '@every 10m',
              source: {
                inline: {
                  script:
                    "step(\"load homepage\", async () => { await page.goto('https://www.elastic.co', { waitUntil: 'networkidle', timeout: 120000 }); });",
                },
              },
            },
          ],
          'cloud.id': '',
          'cloud.auth': '',
        },
        /* these credentials will come from user input, most likely in the form of a saved object when the admin
         * enables the synthetics service */
        headers: {
          Authorization: 'Basic ' + Buffer.from('username:password').toString('base64'),
        },
      });
    } catch (e) {
      throw e;
    }
  },
});
