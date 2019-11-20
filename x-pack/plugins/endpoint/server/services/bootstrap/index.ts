/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient, LoggerFactory, Logger } from 'kibana/server';
import { alreadyExists } from './errors';
// figure out how to read in a json file
import endpointTemplate from './template.json';

const templateVersion = 1;
const appName = 'endpoint';
const ilmName = 'endpoint_policy';
const fanPipeline = 'route-events';

// TODO need to get the version of the endpoint app
const appVersion = '1.0.0';

const defaultILM = {
  policy: {
    phases: {
      hot: {
        actions: {
          rollover: {
            max_size: '50GB',
            max_age: '30d',
          },
        },
      },
      delete: {
        min_age: '90d',
        actions: {
          delete: {},
        },
      },
    },
  },
};

function makeIndexName(alias: string): string {
  return `${alias}-000001`;
}

function makeNameVersion(name: string, version: string): string {
  return name + '-' + version;
}

function makeAliasBody(alias: string): any {
  return {
    aliases: {
      [alias]: {
        is_write_index: true,
      },
    },
  };
}

function makeTemplateBody(version: number, lifecycleName: string, lifecycleRollOverAlias: string) {
  const body = JSON.parse(JSON.stringify(endpointTemplate));
  body.version = version;
  body.settings.index.lifecycle.name = lifecycleName;
  body.settings.index.lifecycle.rollover_alias = lifecycleRollOverAlias;
  return body;
}

// TODO implement retries
export class BootstrapService {
  private readonly logger: Logger;
  constructor(private readonly client: IScopedClusterClient, log: LoggerFactory) {
    this.logger = log.get('bootstrap');
  }

  private async aliasExists(alias: string): Promise<boolean> {
    try {
      const res = await this.client.callAsCurrentUser('indices.existsAlias', {
        name: alias,
      });
      this.logger.debug(`alias returned ${res}`);
      return true;
    } catch (e) {
      this.logger.warn(`failed to retrieve alias: ${e.message}`);
      return false;
    }
  }

  private async createIndex() {
    const alias = appName;
    try {
      const res = await this.client.callAsCurrentUser('indices.create', {
        index: makeIndexName(makeNameVersion(appName, appVersion)),
        body: makeAliasBody(alias),
      });
      this.logger.info(`success: ${res}`);
    } catch (e) {
      if (alreadyExists(e)) {
        this.logger.debug('index already exists');
      } else if (await this.aliasExists(alias)) {
        this.logger.debug(`alias: ${alias} already exists`);
      } else {
        throw e;
      }
    }
  }

  private async createILMPolicy() {
    const policy = makeNameVersion(ilmName, appVersion);
    try {
      const getRes = await this.client.callAsCurrentUser('transport.request', {
        path: `/_ilm/policy/${policy}`,
      });

      if (getRes && getRes[policy]) {
        this.logger.info(`found ILM policy: ${policy}`);
        return;
      }
    } catch (e) {
      const isError = e?.body?.error?.type !== 'resource_not_found_exception' ?? true;
      if (isError) {
        throw e;
      }
    }

    this.logger.info(`ILM policy: ${policy} does not exist`);
    this.logger.info(`Creating ILM policy: ${policy}`);
    await this.client.callAsCurrentUser('transport.request', {
      path: `/_ilm/policy/${policy}`,
      body: defaultILM,
      method: 'PUT',
    });
  }

  private async createTemplate(
    name: string,
    tempVersion: number,
    lcName: string,
    lcRollAlias: string
  ) {
    const res = await this.client.callAsCurrentUser('indices.putTemplate', {
      name,
      body: makeTemplateBody(tempVersion, lcName, lcRollAlias),
    });
    if (!res?.acknowledged) {
      throw new Error('failed to create template');
    }
  }

  private async ensureTemplate() {
    const templateName = makeNameVersion(appName, appVersion);
    const lifecycleName = makeNameVersion(ilmName, appVersion);
    const lifecycleRollOverAlias = makeNameVersion(appName, appVersion);

    let getTempRes: any;
    try {
      getTempRes = await this.client.callAsCurrentUser('indices.getTemplate', {
        name: templateName,
        flat_settings: true,
      });
    } catch (e) {
      if (e?.body?.status !== 200) {
        return await this.createTemplate(
          templateName,
          templateVersion,
          lifecycleName,
          lifecycleRollOverAlias
        );
      }
    }

    const version = getTempRes?.body?.version ?? -1;
    if (version === -1) {
      this.logger.info('no template exists, creating a template');
      return await this.createTemplate(
        templateName,
        templateVersion,
        lifecycleName,
        lifecycleRollOverAlias
      );
    }

    this.logger.info(`upstream template version: ${version} kibana version: ${templateVersion}`);
    if (version >= templateVersion) {
      this.logger.info('skipping template creation');
      return;
    }

    this.logger.info('creating newer template version');
    return await this.createTemplate(
      templateName,
      templateVersion,
      lifecycleName,
      lifecycleRollOverAlias
    );
  }

  private async createAlias() {
    const index = makeIndexName(makeNameVersion(appName, appVersion));
    this.logger.info(`creating alias [${appName}] for index [${index}]`);
    const res = await this.client.callAsCurrentUser('indices.putAlias', {
      index,
      name: appName,
    });
    this.logger.info(`response: ${res}`);
  }

  private async createIngestPipeline() {
    this.logger.info(`creating ingest pipeline [${fanPipeline}]`);
    await this.client.callAsCurrentUser('ingest.putPipeline', {
      id: fanPipeline,
      body: {
        description: 'sends events to specific indices',
        processors: [
          {
            set: {
              if: 'ctx.endgame.event_type_full == alert_event',
              field: '_index',
              value: 'alerts',
            },
          },
        ],
      },
    });
  }

  async doBootstrapping() {
    await this.createILMPolicy();
    await this.ensureTemplate();
    await this.createIndex();
  }
}
