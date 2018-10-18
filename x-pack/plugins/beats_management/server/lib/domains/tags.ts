/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { intersection, uniq, values } from 'lodash';
import { UNIQUENESS_ENFORCING_TYPES } from '../../../common/constants';
import { ConfigurationBlock } from '../../../common/domain_types';
import { FrameworkUser } from '../adapters/framework/adapter_types';

import { entries } from '../../utils/polyfills';
import { CMTagsAdapter } from '../adapters/tags/adapter_types';

export class CMTagsDomain {
  constructor(private readonly adapter: CMTagsAdapter) {}

  public async getAll(user: FrameworkUser, ESQuery?: any) {
    return await this.adapter.getAll(user, ESQuery);
  }

  public async getTagsWithIds(user: FrameworkUser, tagIds: string[]) {
    return await this.adapter.getTagsWithIds(user, tagIds);
  }

  public async delete(user: FrameworkUser, tagIds: string[]) {
    return await this.adapter.delete(user, tagIds);
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

    const tag = {
      ...config,
      id: tagId,
      last_updated: new Date(),
    };
    return {
      isValid: true,
      result: await this.adapter.upsertTag(user, tag),
    };
  }

  private validateConfigurationBlocks(configurationBlocks: any) {
    const types = uniq(configurationBlocks.map((block: any) => block.type));

    // If none of the types in the given configuration blocks are uniqueness-enforcing,
    // we don't need to perform any further validation checks.
    const uniquenessEnforcingTypes = intersection(types, UNIQUENESS_ENFORCING_TYPES);
    if (uniquenessEnforcingTypes.length === 0) {
      return { isValid: true };
    }

    // Count the number of uniqueness-enforcing types in the given configuration blocks
    const typeCountMap = configurationBlocks.reduce((map: any, block: any) => {
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
