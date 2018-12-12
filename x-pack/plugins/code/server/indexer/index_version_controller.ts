/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient } from '@code/esqueue';
import _ from 'lodash';

import { IndexMigrator } from '.';
import { Log } from '../log';
import { IndexCreationRequest } from './index_creation_request';
import pkg from './schema/version.json';

export class IndexVersionController {
  private version: number;

  constructor(protected readonly client: EsClient, private readonly log: Log) {
    this.version = Number(pkg.codeIndexVersion);
  }

  public async tryUpgrade(request: IndexCreationRequest) {
    this.log.info(`Try upgrade index mapping/settings for index ${request.index}.`);
    const esIndexVersion = await this.getIndexVersionFromES(request.index, request.type);
    const needUpgrade = this.needUpgrade(esIndexVersion);
    if (needUpgrade) {
      const migrator = new IndexMigrator(this.client, this.log);
      const oldIndexName = `${request.index}-${esIndexVersion}`;
      this.log.info(
        `Migrate index mapping/settings from version ${esIndexVersion} for ${request.index}`
      );
      return migrator.migrateIndex(oldIndexName, request);
    } else {
      this.log.info(`Index version is update-to-date for ${request.index}`);
    }
  }

  /*
   * Currently there is a simple rule to decide if we need upgrade the index or not: if the index
   * version is smaller than current version specified in the package.json file under `codeIndexVersion`.
   */
  protected needUpgrade(oldIndexVersion: number): boolean {
    return oldIndexVersion < this.version;
  }

  private async getIndexVersionFromES(indexName: string, typeName: string): Promise<number> {
    try {
      const res = await this.client.indices.getMapping({
        index: indexName,
      });
      const esIndexName = Object.keys(res)[0];
      return _.get(res, [esIndexName, 'mappings', typeName, '_meta', 'version'], 0);
    } catch (error) {
      this.log.error(`Get index version error for ${indexName}.`);
      this.log.error(error);
      return 0;
    }
  }
}
