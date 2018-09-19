/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import yaml from 'js-yaml';
import { omit, pick } from 'lodash';
import { BeatTag, ConfigurationBlock } from '../../common/domain_types';
import { ConfigContent } from '../../common/domain_types';
import { CMTagsAdapter } from './adapters/tags/adapter_types';

export class TagsLib {
  constructor(private readonly adapter: CMTagsAdapter, private readonly tagConfigs: any) {}

  public async getTagsWithIds(tagIds: string[]): Promise<BeatTag[]> {
    return this.jsonConfigToUserYaml(await this.adapter.getTagsWithIds(tagIds));
  }
  public async delete(tagIds: string[]): Promise<boolean> {
    return await this.adapter.delete(tagIds);
  }
  public async getAll(): Promise<BeatTag[]> {
    return this.jsonConfigToUserYaml(await this.adapter.getAll());
  }
  public async upsertTag(tag: BeatTag): Promise<BeatTag | null> {
    tag.id = tag.id.replace(' ', '-');

    return await this.adapter.upsertTag(this.userConfigsToJson([tag])[0]);
  }

  public jsonConfigToUserYaml(tags: BeatTag[]): BeatTag[] {
    return tags.map(tag => {
      const transformedTag: BeatTag = tag as any;
      // configuration_blocks yaml, JS cant read YAML so we parse it into JS,
      // because beats flattens all fields, and we need more structure.
      // we take tagConfigs, grab the config that applies here, render what we can into
      // an object, and the rest we assume to be the yaml string that goes
      // into the yaml editor...
      // NOTE: The perk of this, is that as we support more features via controls
      // vs yaml editing, it should "just work", and things that were in YAML
      // will now be in the UI forms...
      transformedTag.configuration_blocks = (tag.configuration_blocks || []).map(block => {
        const { type, description, configs } = block;
        const activeConfig = configs[0];
        const thisConfig = this.tagConfigs.find((conf: any) => conf.value === type).config;
        const knownConfigIds = thisConfig.map((config: any) => config.id);

        const convertedConfig = knownConfigIds.reduce((blockObj: any, id: keyof ConfigContent) => {
          blockObj[id] =
            id === 'other' ? yaml.dump(omit(activeConfig, knownConfigIds)) : activeConfig[id];

          return blockObj;
        }, {});

        // Workaround to empty object passed into dump resulting in this odd output
        if (convertedConfig.other && convertedConfig.other === '{}\n') {
          convertedConfig.other = '';
        }

        return {
          type,
          description,
          configs: [convertedConfig],
        } as ConfigurationBlock;
      });
      return transformedTag;
    });
  }

  public userConfigsToJson(tags: BeatTag[]): BeatTag[] {
    return tags.map(tag => {
      const transformedTag: BeatTag = tag as any;
      // configurations is the JS representation of the config yaml,
      // so here we take that JS and convert it into a YAML string.
      // we do so while also flattening "other" into the flat yaml beats expect
      transformedTag.configuration_blocks = (tag.configuration_blocks || []).map(block => {
        const { type, description, configs } = block;
        const activeConfig = configs[0];
        const thisConfig = this.tagConfigs.find((conf: any) => conf.value === type).config;
        const knownConfigIds = thisConfig
          .map((config: any) => config.id)
          .filter((id: string) => id !== 'other');

        const convertedConfig = {
          ...yaml.safeLoad(activeConfig.other),
          ...pick(activeConfig, knownConfigIds),
        };

        return {
          type,
          description,
          configs: [convertedConfig],
        } as ConfigurationBlock;
      });

      return transformedTag;
    });
  }
}
