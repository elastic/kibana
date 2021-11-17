/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { CoreStart, SavedObjectsClientContract } from 'kibana/server';
import { getMonitors } from './get_monitors';
import { UptimeConfig } from '../../config';
import { getDefaultESHosts } from './get_cloud_es_host';
import { CloudSetup } from '../../../../cloud/server';
import { DynamicSettings, SyntheticsServiceApiKey } from '../../../common/runtime_types';

export const pushConfigs = async ({
  savedObjectsClient,
  core,
  config,
  cloud,
  apiKey,
  settings,
}: {
  savedObjectsClient?: SavedObjectsClientContract;
  core?: CoreStart;
  config: UptimeConfig;
  cloud?: CloudSetup;
  apiKey: SyntheticsServiceApiKey;
  settings: DynamicSettings;
}) => {
  const monitors = await getMonitors({ savedObjectsClient, core });
  const esHosts = getDefaultESHosts({ config, cloud });
  const data = {
    monitors,
    output: {
      hosts: esHosts,
      api_key: `${apiKey.id}:${apiKey.api_key}`,
    },
  };

  const { serviceUrl, servicePassword, serviceUsername } = getServiceCredentials({
    config,
    settings,
  });
  try {
    // service doesn't currently take api key, but will need to be passed
    await axios({
      method: 'POST',
      url: serviceUrl + '/cronjob',
      data,
      /* these credentials will come from user input, most likely in the form of a saved object when the admin
       * enables the synthetics service */
      headers: {
        Authorization:
          'Basic ' + Buffer.from(`${serviceUsername}:${servicePassword}`).toString('base64'),
      },
    });
  } catch (e) {
    console.log(e);
  }
};

export const getServiceCredentials = ({
  config,
  settings,
}: {
  config: UptimeConfig;
  settings: DynamicSettings;
}) => {
  let serviceUrl = config.unsafe.service.url;
  let serviceUsername = config.unsafe.service.username;
  let servicePassword = config.unsafe.service.password;
  if (settings.serviceUrl) {
    serviceUrl = settings.serviceUrl;
  }
  if (settings.serviceUsername) {
    serviceUsername = settings.serviceUsername;
  }
  if (settings.servicePassword) {
    servicePassword = settings.servicePassword;
  }

  return { serviceUrl, serviceUsername, servicePassword };
};
