/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { IndexMigrator } from '.';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { IndexCreationRequest } from './index_creation_request';
import pkg from './schema/version.json';

export class IndexVersionController {
  private version: number;

  constructor(protected readonly client: EsClient, private readonly log: Logger) {
    this.version = Number(pkg.codeIndexVersion);
  }

  public async tryUpgrade(request: IndexCreationRequest) {
    this.log.debug(`Try upgrade index mapping/settings for index ${request.index}.`);
    const esIndexVersion = await this.getIndexVersionFromES(request.index);
    const needUpgrade = this.needUpgrade(esIndexVersion);
    if (needUpgrade) {
      const migrator = new IndexMigrator(this.client, this.log);
      const oldIndexName = `${request.index}-${esIndexVersion}`;
      this.log.warn(
        `Migrate index mapping/settings from version ${esIndexVersion} for ${request.index}`
      );
      return migrator.migrateIndex(oldIndexName, request);
    } else {
      this.log.debug(`Index version is update-to-date for ${request.index}`);
    }
  }

  /*
   * Currently there is a simple rule to decide if we need upgrade the index or not: if the index
   * version is smaller than current version specified in the package.json file under `codeIndexVersion`.
   */
  protected needUpgrade(oldIndexVersion: number): boolean {
    return oldIndexVersion < this.version;
  }

  private async getIndexVersionFromES(indexName: string): Promise<number> {
    try {
      const res = await this.client.indices.getMapping({
        index: indexName,
      });
      const esIndexName = Object.keys(res)[0];
      const version = _.get(res, [esIndexName, 'mappings', '_meta', 'version'], 0);
      if (version === 0) {
        this.log.error(`Can't find index version for ${indexName}.`);
      }
      return version;
    } catch (error) {
      this.log.error(`Get index version error for ${indexName}.`);
      this.log.error(error);
      return 0;
    }
  }
}
