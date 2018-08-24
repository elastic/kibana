/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import yaml from 'js-yaml';
import { omit } from 'lodash';
import { BeatTag, ConfigurationBlock } from '../../../common/domain_types';
import { CMTagsAdapter } from '../adapters/tags/adapter_types';
import { ClientSideBeatTag, ClientSideConfigurationBlock } from '../lib';

export class TagsLib {
  constructor(private readonly adapter: CMTagsAdapter, private readonly tagConfigs: any) {}

  public async getTagsWithIds(tagIds: string[]): Promise<ClientSideBeatTag[]> {
    return this.tagYamlToConfigs(await this.adapter.getTagsWithIds(tagIds));
  }
  public async delete(tagIds: string[]): Promise<boolean> {
    return await this.adapter.delete(tagIds);
  }
  public async getAll(): Promise<ClientSideBeatTag[]> {
    return this.tagYamlToConfigs(await this.adapter.getAll());
  }
  public async upsertTag(tag: ClientSideBeatTag): Promise<BeatTag | null> {
    tag.id = tag.id.replace(' ', '-');
    return await this.adapter.upsertTag(this.tagConfigsToYaml([tag])[0]);
  }

  private tagYamlToConfigs(tags: BeatTag[]): ClientSideBeatTag[] {
    return tags.map(tag => {
      const transformedTag: ClientSideBeatTag = tag as any;
      // configuration_blocks yaml, JS cant read YAML so we parse it into JS,
      // because beats flattens all fields, and we need more structure.
      // we take tagConfigs, grab the config that applies here, render what we can into
      // an object, and the rest we assume to be the yaml string that goes
      // into the yaml editor...
      // NOTE: The perk of this, is that as we support more features via controls
      // vs yaml editing, it should "just work", and things that were in YAML
      // will now be in the UI forms...
      transformedTag.configurations = tag.configuration_blocks.map(block => {
        const { type, description, block_yml } = block;
        const rawConfig = yaml.safeLoad(block_yml);
        const thisConfig = this.tagConfigs.find((conf: any) => conf.value === type).config;
        const knownConfigIds = thisConfig.map((config: any) => config.id);

        return {
          type,
          description,
          block_obj: knownConfigIds.reduce((blockObj: any, id: string) => {
            blockObj[id] =
              id === 'other' ? yaml.dump(omit(rawConfig, knownConfigIds)) : rawConfig[id];

            return blockObj;
          }, {}),
        } as ClientSideConfigurationBlock;
      });
      return transformedTag;
    });
  }

  private tagConfigsToYaml(tags: ClientSideBeatTag[]): BeatTag[] {
    return tags.map(tag => {
      const transformedTag: BeatTag = tag as any;
      // configurations is the JS representation of the config yaml,
      // so here we take that JS and convert it into a YAML string.
      // we do so while also flattening "other" into the flat yaml beats expect
      transformedTag.configuration_blocks = tag.configurations.map(block => {
        const { type, description, block_obj } = block;
        const { other, ...configs } = block_obj;
        return {
          type,
          description,
          block_yml: yaml.safeDump({ ...configs, ...yaml.safeLoad(other) }),
        } as ConfigurationBlock;
      });
      return transformedTag;
    });
  }
}
