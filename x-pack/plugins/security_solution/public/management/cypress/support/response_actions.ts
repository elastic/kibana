/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// / <reference types="cypress" />

import { get } from 'lodash';

import {
  getLatestActionDoc,
  updateActionDoc,
  waitForNewActionDoc,
} from '../../../../scripts/endpoint/common/response_actions';
import { createRuntimeServices } from '../../../../scripts/endpoint/common/stack_services';

export const responseActionTasks = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): void => {
  const stackServicesPromise = createRuntimeServices({
    kibanaUrl: config.env.KIBANA_URL,
    elasticsearchUrl: config.env.ELASTICSEARCH_URL,
    fleetServerUrl: config.env.FLEET_SERVER_URL,
    username: config.env.KIBANA_USERNAME,
    password: config.env.KIBANA_PASSWORD,
    asSuperuser: true,
  });

  on('task', {
    getLatestActionDoc: async () => {
      const { esClient } = await stackServicesPromise;
      // cypress doesn't like resolved undefined values
      return getLatestActionDoc(esClient).then((doc) => doc || null);
    },

    // previousActionDoc is used to determine when a new action doc is received
    tamperActionDoc: async (previousActionDoc) => {
      const { esClient } = await stackServicesPromise;
      const newActionDoc = await waitForNewActionDoc(esClient, previousActionDoc);

      if (!newActionDoc) {
        throw new Error('no action doc found');
      }

      const signed = get(newActionDoc, '_source.signed');
      const signedDataBuffer = Buffer.from(signed.data, 'base64');
      const signedDataJson = JSON.parse(signedDataBuffer.toString());
      const tamperedData = {
        ...signedDataJson,
        comment: 'tampered data',
      };
      const tamperedDataString = Buffer.from(JSON.stringify(tamperedData), 'utf8').toString(
        'base64'
      );
      const tamperedDoc = {
        signed: {
          ...signed,
          data: tamperedDataString,
        },
      };
      return updateActionDoc(esClient, newActionDoc._id, tamperedDoc);
    },
  });
};
