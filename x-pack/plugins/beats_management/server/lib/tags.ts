/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { intersection, uniq, values } from 'lodash';
import { configBlockSchemas } from '../../common/config_schemas';
import { UNIQUENESS_ENFORCING_TYPES } from '../../common/constants';
import {
  BeatTag,
  ConfigurationBlock,
  createConfigurationBlockInterface,
  OutputTypesArray,
} from '../../common/domain_types';
import { entries } from '../utils/polyfills';
import { ConfigurationBlockAdapter } from './adapters/configuration_blocks/adapter_types';
import { FrameworkUser } from './adapters/framework/adapter_types';
import { CMTagsAdapter } from './adapters/tags/adapter_types';

export class CMTagsDomain {
  constructor(
    private readonly tagAdapter: CMTagsAdapter,
    private readonly configBlocksAdapter: ConfigurationBlockAdapter
  ) {}

  public async getAll(user: FrameworkUser, ESQuery?: any): Promise<BeatTag[]> {
    const tags = await this.tagAdapter.getAll(user, ESQuery);

    const pConfigBlocks = tags.map(async tag => {
      return await this.configBlocksAdapter.getByIds(user, tag.configuration_block_ids);
    });
    const configBlocks = await Promise.all(pConfigBlocks);

    return tags.map(({ configuration_block_ids, last_updated, ...tag }, index) => {
      return {
        ...tag,
        last_updated: new Date(last_updated),
        configuration_blocks: configBlocks[index],
      };
    });
  }

  public async getTagsWithIds(user: FrameworkUser, tagIds: string[]): Promise<BeatTag[]> {
    const tags = await this.tagAdapter.getTagsWithIds(user, tagIds);

    const pConfigBlocks = tags.map(async tag => {
      return await this.configBlocksAdapter.getByIds(user, tag.configuration_block_ids);
    });
    const configBlocks = await Promise.all(pConfigBlocks);

    return tags.map(({ configuration_block_ids, last_updated, ...tag }, index) => {
      return {
        ...tag,
        last_updated: new Date(last_updated),
        configuration_blocks: configBlocks[index],
      };
    });
  }

  public async delete(user: FrameworkUser, tagIds: string[]) {
    return await this.tagAdapter.delete(user, tagIds);
  }

  public async saveTag(
    user: FrameworkUser,
    tagId: string,
    config: { color: string; configuration_blocks: ConfigurationBlock[] }
  ) {
    const { isValid, message } = await this.validateConfigurationBlocks(
      config.configuration_blocks
    );
    if (!isValid) {
      return { isValid, result: message };
    }

    const existingTag = (await this.tagAdapter.getTagsWithIds(user, [tagId]))[0];

    const newConfigBlocks = config.configuration_blocks.filter(c => !c.id);
    let configBlockIds: string[] = [];
    if (newConfigBlocks) {
      configBlockIds = await this.configBlocksAdapter.create(user, newConfigBlocks);
    }

    configBlockIds = configBlockIds.concat(existingTag.configuration_block_ids);

    const tag = {
      color: config.color,
      configuration_block_ids: configBlockIds,
      id: tagId,
      last_updated: new Date().toISOString(),
    };
    return {
      isValid: true,
      result: await this.tagAdapter.upsertTag(user, tag),
    };
  }

  private validateConfigurationBlocks(configurationBlocks: ConfigurationBlock[]) {
    const validationMap = {
      isHosts: t.array(t.string),
      isString: t.string,
      isPeriod: t.string,
      isPath: t.string,
      isPaths: t.array(t.string),
      isYaml: t.string,
    };

    for (const [index, block] of configurationBlocks.entries()) {
      const blockSchema = configBlockSchemas.find(s => s.id === block.type);
      if (!blockSchema) {
        return {
          isValid: false,
          message: `Invalid config type of ${
            block.type
          } used in 'configuration_blocks' at index ${index}`,
        };
      }

      const interfaceConfig = blockSchema.configs.reduce(
        (props, config) => {
          if (config.options) {
            props[config.id] = t.union(config.options.map(opt => t.literal(opt.value)));
          } else if (config.validation) {
            props[config.id] = validationMap[config.validation];
          }

          return props;
        },
        {} as t.Props
      );

      const runtimeInterface = createConfigurationBlockInterface(
        t.literal(blockSchema.id),
        t.interface(interfaceConfig)
      );

      const validationResults = runtimeInterface.decode(block);

      if (validationResults.isLeft()) {
        return {
          isValid: false,
          message: `configuration_blocks validation error, configuration_blocks at index ${index} is invalid. ${
            PathReporter.report(validationResults)[0]
          }`,
        };
      }
    }

    // Get all output types in the array of config blocks
    const outputTypes: string[] = configurationBlocks.reduce((typesCollector: string[], block) => {
      if (block.type !== 'output') {
        return typesCollector;
      }

      typesCollector = [...typesCollector, ...Object.keys(block.config)];
      return typesCollector;
    }, []);

    // If not a provided output type, fail validation
    if (outputTypes.some((type: string) => !OutputTypesArray.includes(type))) {
      return { isValid: false, message: 'Invalid output type' };
    }
    const types = uniq(configurationBlocks.map(block => block.type));

    // If none of the types in the given configuration blocks are uniqueness-enforcing,
    // we don't need to perform any further validation checks.
    const uniquenessEnforcingTypes = intersection(types, UNIQUENESS_ENFORCING_TYPES);
    if (uniquenessEnforcingTypes.length === 0) {
      return { isValid: true };
    }

    // Count the number of uniqueness-enforcing types in the given configuration blocks
    const typeCountMap = configurationBlocks.reduce((map: any, block) => {
      const { type } = block;
      if (!uniquenessEnforcingTypes.includes(type)) {
        return map;
      }

      const count = map[type] || 0;
      return {
        ...map,
        [type]: count + 1,
      };
    }, {});

    // If there is no more than one of any uniqueness-enforcing types in the given
    // configuration blocks, we don't need to perform any further validation checks.
    if (values(typeCountMap).filter(count => count > 1).length === 0) {
      return { isValid: true };
    }

    const message = entries(typeCountMap)
      .filter(([, count]) => count > 1)
      .map(
        ([type, count]) =>
          `Expected only one configuration block of type '${type}' but found ${count}`
      )
      .join(' ');

    return {
      isValid: false,
      message,
    };
  }
}
