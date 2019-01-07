/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import yaml from 'js-yaml';
import { get, omit, set } from 'lodash';
import { ConfigBlockSchema, ConfigurationBlock } from '../../common/domain_types';

export class ConfigBlocksLib {
  constructor(private readonly configSchemas: ConfigBlockSchema[]) {}

  public async create(block: ConfigurationBlock): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      resolve(true);
    });
  }

  public async getForTag(tagId: string, page: number = 1): Promise<ConfigurationBlock[]> {
    return new Promise<ConfigurationBlock[]>(resolve => {
      resolve(
        tagId !== 'first'
          ? []
          : [
              {
                id: 'foo',
                type: 'filebeat.inputs',
                description: 'some description',
                tag: 'first',
                config: {},
                last_updated: 1546628516,
              },
            ]
      );
    });
  }

  public async update(block: ConfigurationBlock): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      resolve(true);
    });
  }

  public async delete(id: string): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      resolve(true);
    });
  }

  public jsonConfigToUserYaml(blocks: ConfigurationBlock[]): ConfigurationBlock[] {
    // configuration_blocks yaml, JS cant read YAML so we parse it into JS,
    // because beats flattens all fields, and we need more structure.
    // we take tagConfigs, grab the config that applies here, render what we can into
    // an object, and the rest we assume to be the yaml string that goes
    // into the yaml editor...
    // NOTE: The perk of this, is that as we support more features via controls
    // vs yaml editing, it should "just work", and things that were in YAML
    // will now be in the UI forms...
    return blocks.map(({ type, description, config }) => {
      const thisConfigSchema = this.configSchemas.find(conf => conf.id === type);
      const thisConfigBlockSchema = thisConfigSchema ? thisConfigSchema.configs : null;
      // TODO handle this error type better
      if (!thisConfigBlockSchema) {
        return {} as any;
      }

      const knownConfigIds: string[] = thisConfigBlockSchema.map(schema => schema.id);
      const convertedConfig: ConfigurationBlock['config'] = knownConfigIds.reduce(
        (blockObj: any, configKey: string, index: number) => {
          const unhydratedKey = knownConfigIds[index];
          set(
            blockObj,
            configKey,
            configKey === 'other'
              ? yaml.dump(omit(config, knownConfigIds))
              : get(config, unhydratedKey)
          );

          return blockObj;
        },
        {}
      );

      // Workaround to empty object passed into dump resulting in this odd output
      if (convertedConfig.other && convertedConfig.other === '{}\n') {
        convertedConfig.other = '';
      }

      return {
        type,
        description,
        config: convertedConfig,
      };
    });
  }

  public userConfigsToJson(blocks: ConfigurationBlock[]): ConfigurationBlock[] {
    // configurations is the JS representation of the config yaml,
    // so here we take that JS and convert it into a YAML string.
    // we do so while also flattening "other" into the flat yaml beats expect
    return blocks.map(block => {
      const { type, description, config } = block;
      const thisConfigSchema = this.configSchemas.find(conf => conf.id === type);
      const thisConfigBlockSchema = thisConfigSchema ? thisConfigSchema.configs : null;
      // TODO handle this error type better
      if (!thisConfigBlockSchema) {
        return {} as any;
      }
      const knownConfigIds = thisConfigBlockSchema
        .map((schema: ConfigurationBlock['config']) => schema.id)
        .filter((id: string) => id !== 'other');

      const picked = this.pickDeep(config, knownConfigIds);

      const convertedConfig = {
        ...yaml.safeLoad(config.other || '{}'),
        ...picked,
      };

      return {
        type,
        description,
        config: convertedConfig,
      };
    });
  }

  private pickDeep(obj: { [key: string]: any }, keys: string[]) {
    const copy = {};
    _.forEach(keys, key => {
      if (_.has(obj, key)) {
        const val = _.get(obj, key);
        _.set(copy, key, val);
      }
    });
    return copy;
  }
}
