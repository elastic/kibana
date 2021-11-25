/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, Logger, SavedObjectsClient, SavedObjectsClientContract } from 'kibana/server';
import axios from 'axios';
import { UptimeCoreSetup } from '../adapters';
import { installSyntheticsIndexTemplates } from '../../rest_api/synthetics_service/install_index_templates';
import { SyntheticsServiceApiKey } from '../../../common/runtime_types/synthetics_service_api_key';
import { getAPIKeyForSyntheticsService } from './get_api_key';
import { SyntheticsMonitorSavedObject } from '../../../common/types';
import { syntheticsMonitorType } from '../saved_objects/synthetics_monitor';
import { getEsHosts } from './get_es_hosts';
import { getMonitors } from './push_configs';
import { UptimeConfig } from '../../../common/config';

export class SyntheticsService {
  private logger: Logger;
  private config: UptimeConfig;
  private server: UptimeCoreSetup;

  private esHosts: string[];

  private apiKey: SyntheticsServiceApiKey | undefined;

  constructor(logger: Logger, server: UptimeCoreSetup) {
    this.logger = logger;
    this.server = server;
    this.config = server.config;

    this.esHosts = getEsHosts({ config: this.config, cloud: server.cloud });
  }

  public async init(coreStart: CoreStart) {
    const apiKey = await getAPIKeyForSyntheticsService({});

    if (apiKey && !(apiKey instanceof Error)) {
      this.apiKey = apiKey;
    } else if (apiKey) {
      this.logger.error(apiKey);
    }
  }

  setupTemplate(coreStart: CoreStart) {
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const savedObjectsClient = new SavedObjectsClient(
      coreStart.savedObjects.createInternalRepository()
    );

    installSyntheticsIndexTemplates({
      esClient,
      server: this.server,
      savedObjectsClient,
    }).then(
      (result) => {
        if (result.name === 'synthetics' && result.install_status === 'installed') {
          this.logger.info('Installed synthetics index templates');
        } else if (result.name === 'synthetics' && result.install_status === 'install_failed') {
          this.logger.warn('Failed to install synthetics index templates');
        }
      },
      () => {
        this.logger.warn('Failed to install synthetics index templates');
      }
    );
  }

  async pushConfigs() {
    const monitors = await this.getMonitorConfigs({ savedObjectsClient });
    const data = {
      monitors,
      output: {
        hosts: this.esHosts,
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
  }

  async getMonitorConfigs({
    savedObjectsClient,
  }: {
    savedObjectsClient: SavedObjectsClientContract;
  }) {
    const monitorsSavedObjects = await savedObjectsClient.find<SyntheticsMonitorSavedObject>({
      type: syntheticsMonitorType,
    });

    const savedObjectsList = monitorsSavedObjects.saved_objects;
    return savedObjectsList.map(({ attributes, id }) => ({
      ...attributes,
      id,
    }));
  }
}
