/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamSpacesAdapter, type InstallParams } from '@kbn/data-stream-adapter';
import { ruleMigrationsFieldMap } from './rule_migrations_field_map';

const TOTAL_FIELDS_LIMIT = 2500;

const DATA_STREAM_NAME = '.kibana.siem-rule-migrations';
const INDEX_TEMPLATE_NAME = '.kibana.siem-rule-migrations-index-template';
const COMPONENT_TEMPLATE_NAME = '.kibana.siem-rule-migrations-mappings';
const ECS_COMPONENT_TEMPLATE_NAME = 'ecs';

export class RuleMigrationsDataStream {
  private readonly dataStream: DataStreamSpacesAdapter;
  private installPromise?: Promise<void>;

  constructor({ kibanaVersion }: { kibanaVersion: string }) {
    this.dataStream = new DataStreamSpacesAdapter(DATA_STREAM_NAME, {
      kibanaVersion,
      totalFieldsLimit: TOTAL_FIELDS_LIMIT,
    });
    this.dataStream.setComponentTemplate({
      name: COMPONENT_TEMPLATE_NAME,
      fieldMap: ruleMigrationsFieldMap,
    });

    this.dataStream.setIndexTemplate({
      name: INDEX_TEMPLATE_NAME,
      componentTemplateRefs: [COMPONENT_TEMPLATE_NAME, ECS_COMPONENT_TEMPLATE_NAME],
    });
  }

  async install(params: InstallParams) {
    try {
      this.installPromise = this.dataStream.install(params);
      await this.installPromise;
    } catch (err) {
      params.logger.error(
        `Error installing siem rule migrations data stream. Data quality dashboard persistence may be impacted.- ${err.message}`,
        err
      );
    }
  }

  async installSpace(spaceId: string): Promise<string> {
    if (!this.installPromise) {
      throw new Error('Siem rule migrations data stream not installed');
    }
    // wait for install to complete, may reject if install failed, routes should handle this
    await this.installPromise;
    let dataStreamName = await this.dataStream.getInstalledSpaceName(spaceId);
    if (!dataStreamName) {
      dataStreamName = await this.dataStream.installSpace(spaceId);
    }
    return dataStreamName;
  }
}
