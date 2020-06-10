/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import yaml from 'js-yaml';
import { get, has, omit, set } from 'lodash';
import {
  ConfigBlockSchema,
  ConfigurationBlock,
} from '../../../../legacy/plugins/beats_management/common/domain_types';
import { FrontendConfigBlocksAdapter } from './adapters/configuration_blocks/adapter_types';

export class ConfigBlocksLib {
  public delete = this.adapter.delete.bind(this.adapter);

  constructor(
    private readonly adapter: FrontendConfigBlocksAdapter,
    private readonly configSchemas: ConfigBlockSchema[]
  ) {}

  public upsert = async (blocks: ConfigurationBlock[]) => {
    return await this.adapter.upsert(this.userConfigsToJson(blocks));
  };

  public getForTags = async (tagIds: string[], page: number) => {
    const result = await this.adapter.getForTags(tagIds, page);
    result.list = this.jsonConfigToUserYaml(result.list);
    return result;
  };

  public jsonConfigToUserYaml(blocks: ConfigurationBlock[]): ConfigurationBlock[] {
    // configuration_blocks yaml, JS cant read YAML so we parse it into JS,
    // because beats flattens all fields, and we need more structure.
    // we take tagConfigs, grab the config that applies here, render what we can into
    // an object, and the rest we assume to be the yaml string that goes
    // into the yaml editor...
    // NOTE: The perk of this, is that as we support more features via controls
    // vs yaml editing, it should "just work", and things that were in YAML
    // will now be in the UI forms...
    return blocks.map((block) => {
      const { type, config } = block;

      const thisConfigSchema = this.configSchemas.find((conf) => conf.id === type);
      const thisConfigBlockSchema = thisConfigSchema ? thisConfigSchema.configs : null;
      if (!thisConfigBlockSchema) {
        throw new Error('No config block schema ');
      }

      const knownConfigIds: string[] = thisConfigBlockSchema.map((schema) => schema.id);

      const convertedConfig: ConfigurationBlock['config'] = knownConfigIds.reduce(
        (blockObj: any, configKey: string, index: number) => {
          const unhydratedKey = knownConfigIds[index];

          set(blockObj, configKey, get(config, unhydratedKey));

          return blockObj;
        },
        thisConfigSchema && thisConfigSchema.allowOtherConfigs
          ? { other: yaml.safeDump(omit(config, knownConfigIds)) }
          : {}
      );

      // Workaround to empty object passed into dump resulting in this odd output
      if (convertedConfig.other && convertedConfig.other === '{}\n') {
        convertedConfig.other = '';
      }

      return {
        ...block,
        config: convertedConfig,
      };
    });
  }

  public userConfigsToJson(blocks: ConfigurationBlock[]): ConfigurationBlock[] {
    // configurations is the JS representation of the config yaml,
    // so here we take that JS and convert it into a YAML string.
    // we do so while also flattening "other" into the flat yaml beats expect
    return blocks.map((block) => {
      const { type, config } = block;
      const thisConfigSchema = this.configSchemas.find((conf) => conf.id === type);
      const thisConfigBlockSchema = thisConfigSchema ? thisConfigSchema.configs : null;
      if (!thisConfigBlockSchema) {
        throw new Error('No config block schema ');
      }
      const knownConfigIds = thisConfigBlockSchema
        .map((schema: ConfigurationBlock['config']) => schema.id)
        .filter((id: string) => id !== 'other');

      const picked = this.pickDeep(config, knownConfigIds);
      let other = yaml.safeLoad(config.other || '{}');
      if (typeof other === 'string') {
        other = {
          [other]: '',
        };
      }

      const convertedConfig = {
        ...other,
        ...picked,
      };

      return {
        ...block,
        config: convertedConfig,
      };
    });
  }

  private pickDeep(obj: { [key: string]: any }, keys: string[]) {
    const copy = {};
    keys.forEach((key) => {
      if (has(obj, key)) {
        const val = get(obj, key);
        set(copy, key, val);
      }
    });
    return copy;
  }
}
