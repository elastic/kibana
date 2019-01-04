/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ConfigurationBlock } from '../../common/domain_types';
import { ConfigurationBlockAdapter } from './adapters/configuration_blocks/adapter_types';
import { FrameworkUser } from './adapters/framework/adapter_types';

export class ConfigurationBlocksLib {
  constructor(private readonly adapter: ConfigurationBlockAdapter) {}

  public async getForTags(user: FrameworkUser, tagIds: string[]): Promise<ConfigurationBlock[]> {
    const blocks = await this.adapter.getForTags(user, tagIds);

    // const pConfigBlocks = tags.map(async tag => {
    //   return await this.configBlocksAdapter.getByIds(user, tag.configuration_block_ids);
    // });
    // const configBlocks = await Promise.all(pConfigBlocks);

    return blocks.map(({ last_updated, ...block }) => {
      return {
        ...block,
        last_updated: new Date(last_updated),
      };
    });
  }

  public async delete(user: FrameworkUser, ids: string[]) {
    return await this.adapter.delete(user, ids);
  }

  public async save(user: FrameworkUser, tagId: string, block: ConfigurationBlock[]) {
    // try {
    //   await this.preventDupeConfigurationBlocks(block.config);
    //   validateConfigurationBlocks(block.config);
    // } catch (e) {
    //   return { isValid: false, result: e.message };
    // }

    // const existingTag = (await this.tagAdapter.getTagsWithIds(user, [tagId]))[0];

    // const newConfigBlocks = config.configuration_blocks.filter(c => !c.id);
    // let configBlockIds: string[] = [];
    // if (newConfigBlocks) {
    //   configBlockIds = await this.configBlocksAdapter.create(user, newConfigBlocks);
    // }

    // configBlockIds = configBlockIds.concat(existingTag.configuration_block_ids);

    return {
      isValid: true,
      result: await this.adapter.create(user, block),
    };
  }

  // private preventDupeConfigurationBlocks(configurationBlocks: ConfigurationBlock[]) {
  //   // Get all output types in the array of config blocks
  //   const outputTypes: string[] = configurationBlocks.reduce((typesCollector: string[], block) => {
  //     if (block.type !== 'output') {
  //       return typesCollector;
  //     }

  //     typesCollector = [...typesCollector, ...Object.keys(block.config)];
  //     return typesCollector;
  //   }, []);

  //   // If not a provided output type, fail validation
  //   if (outputTypes.some((type: string) => !OutputTypesArray.includes(type))) {
  //     throw new Error('Invalid output type');
  //   }
  //   const types = uniq(configurationBlocks.map(block => block.type));

  //   // If none of the types in the given configuration blocks are uniqueness-enforcing,
  //   // we don't need to perform any further validation checks.
  //   const uniquenessEnforcingTypes = intersection(types, UNIQUENESS_ENFORCING_TYPES);
  //   if (uniquenessEnforcingTypes.length === 0) {
  //     return true;
  //   }

  //   // Count the number of uniqueness-enforcing types in the given configuration blocks
  //   const typeCountMap = configurationBlocks.reduce((map: any, block) => {
  //     const { type } = block;
  //     if (!uniquenessEnforcingTypes.includes(type)) {
  //       return map;
  //     }

  //     const count = map[type] || 0;
  //     return {
  //       ...map,
  //       [type]: count + 1,
  //     };
  //   }, {});

  //   // If there is no more than one of any uniqueness-enforcing types in the given
  //   // configuration blocks, we don't need to perform any further validation checks.
  //   if (values(typeCountMap).filter(count => count > 1).length === 0) {
  //     return true;
  //   }

  //   const message = entries(typeCountMap)
  //     .filter(([, count]) => count > 1)
  //     .map(
  //       ([type, count]) =>
  //         `Expected only one configuration block of type '${type}' but found ${count}`
  //     )
  //     .join(' ');

  //   throw new Error(message);
  // }
}
