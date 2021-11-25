/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { SavedObjectsClientContract } from 'kibana/server';
import { SyntheticsMonitorSavedObject } from '../../../common/types';
import { syntheticsMonitorType } from '../saved_objects/synthetics_monitor';
import { getEsHosts } from './get_es_hosts';
import { SyntheticsServiceApiKey } from '../../../common/runtime_types/synthetics_service_api_key';
import { CloudSetup } from '../../../../cloud/server';
import { UptimeConfig } from '../../../common/config';

export const pushConfigs = async ({
  savedObjectsClient,
  config,
  cloud,
  apiKey,
}: {
  cloud?: CloudSetup;
  config: UptimeConfig;
  apiKey: SyntheticsServiceApiKey;
  savedObjectsClient: SavedObjectsClientContract;
}) => {
  const monitors = await getMonitors({ savedObjectsClient });
  const esHosts = getEsHosts({ config, cloud });
  const data = {
    monitors,
    output: {
      hosts: esHosts,
      api_key: `${apiKey.id}:${apiKey.apiKey}`,
    },
  };

  const serviceUrl = config.unsafe.service.url;
  const serviceUsername = config.unsafe.service.username;
  const servicePassword = config.unsafe.service.password;

  try {
    await axios({
      method: 'POST',
      url: serviceUrl + '/monitors',
      data,
      headers: {
        Authorization:
          'Basic ' + Buffer.from(`${serviceUsername}:${servicePassword}`).toString('base64'),
      },
    });
  } catch (e) {}
};

export const getMonitors = async ({
  savedObjectsClient,
}: {
  savedObjectsClient: SavedObjectsClientContract;
}) => {
  const monitorsSavedObjects = await savedObjectsClient.find<SyntheticsMonitorSavedObject>({
    type: syntheticsMonitorType,
  });

  const savedObjectsList = monitorsSavedObjects.saved_objects;
  return savedObjectsList.map(({ attributes, id }) => ({
    ...attributes,
    id,
  }));
};
