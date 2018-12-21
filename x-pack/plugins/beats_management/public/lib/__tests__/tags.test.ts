/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BeatTag } from '../../../common/domain_types';
import { supportedConfigs } from '../../config_schemas';
import { CMTagsAdapter } from '../adapters/tags/adapter_types';
import { TagsLib } from '../tags';

describe('Tags Client Domain Lib', () => {
  let tagsLib: TagsLib;

  beforeEach(async () => {
    tagsLib = new TagsLib({} as CMTagsAdapter, supportedConfigs);
  });

  it('should use helper function to convert users yaml in tag to config object', async () => {
    const convertedTag = tagsLib.userConfigsToJson([
      {
        id: 'foo',
        configuration_blocks: [
          {
            type: 'filebeat.inputs',
            description: 'string',
            configs: [{ paths: ['adad/adasd'], other: "something: 'here'" }],
          },
        ],
        color: 'red',
        last_updated: new Date(),
      } as BeatTag,
    ]);

    expect(convertedTag.length).toBe(1);
    expect(convertedTag[0].configuration_blocks.length).toBe(1);
    expect(convertedTag[0].configuration_blocks[0].configs.length).toBe(1);
    expect(convertedTag[0].configuration_blocks[0].configs[0]).not.toHaveProperty('other');
    expect(convertedTag[0].configuration_blocks[0].configs[0]).toHaveProperty('something');
    expect((convertedTag[0].configuration_blocks[0].configs[0] as any).something).toBe('here');
  });

  it('should use helper function to convert user config to json with undefined `other`', async () => {
    const convertedTag = tagsLib.userConfigsToJson([
      {
        id: 'fsdfsdfs',
        color: '#DD0A73',
        configuration_blocks: [
          {
            type: 'filebeat.inputs',
            description: 'sdfsdf',
            configs: [{ paths: ['sdfsfsdf'], other: undefined }],
          },
        ],
        last_updated: '2018-09-04T15:52:08.983Z',
      } as any,
    ]);

    expect(convertedTag.length).toBe(1);
    expect(convertedTag[0].configuration_blocks.length).toBe(1);
    expect(convertedTag[0].configuration_blocks[0].configs.length).toBe(1);
    expect(convertedTag[0].configuration_blocks[0].configs[0]).not.toHaveProperty('other');
  });

  it('should use helper function to convert users yaml in tag to config object, where empty other leads to no other fields saved', async () => {
    const convertedTag = tagsLib.userConfigsToJson([
      {
        id: 'foo',
        configuration_blocks: [
          {
            type: 'filebeat.inputs',
            description: 'string',
            configs: [{ paths: ['adad/adasd'], other: '' }],
          },
        ],
        color: 'red',
        last_updated: new Date(),
      } as BeatTag,
    ]);

    expect(convertedTag.length).toBe(1);
    expect(convertedTag[0].configuration_blocks.length).toBe(1);
    expect(convertedTag[0].configuration_blocks[0].configs.length).toBe(1);
    expect(convertedTag[0].configuration_blocks[0].configs[0]).not.toHaveProperty('other');
  });

  it('should convert tokenized fields to JSON', async () => {
    const convertedTag = tagsLib.userConfigsToJson([
      {
        id: 'dfgdfgdfgdfgdfg',
        color: '#DD0A73',
        configuration_blocks: [
          {
            type: 'output',
            description: 'something',
            configs: [
              {
                output: 'console',
                '{{output}}': { hosts: ['esefsfsgg', 'drgdrgdgr'], username: '', password: '' },
              },
            ],
          },
        ],
        last_updated: '2018-10-22T23:59:59.016Z',
      } as any,
    ]);

    expect(convertedTag.length).toBe(1);
    expect(convertedTag[0].configuration_blocks.length).toBe(1);
    expect(convertedTag[0].configuration_blocks[0].configs.length).toBe(1);
    expect(convertedTag[0].configuration_blocks[0].configs[0]).toHaveProperty('console');
    expect((convertedTag[0].configuration_blocks[0].configs[0] as any).console).toHaveProperty(
      'hosts'
    );

    expect((convertedTag[0].configuration_blocks[0].configs[0] as any).console.hosts.length).toBe(
      2
    );
  });

  it('should convert JSON to tokenized fields', async () => {
    const convertedTag = tagsLib.jsonConfigToUserYaml([
      {
        id: 'dfgdfgdfgdfgdfg',
        color: '#DD0A73',
        configuration_blocks: [
          {
            type: 'output',
            description: 'something',
            configs: [
              {
                output: 'console',
                console: { hosts: ['esefsfsgg', 'drgdrgdgr'], username: '', password: '' },
              },
            ],
          },
        ],
        last_updated: '2018-10-22T23:59:59.016Z',
      } as any,
    ]);

    expect(convertedTag.length).toBe(1);
    expect(convertedTag[0].configuration_blocks.length).toBe(1);
    expect(convertedTag[0].configuration_blocks[0].configs.length).toBe(1);
    expect(convertedTag[0].configuration_blocks[0].configs[0]).toHaveProperty('{{output}}');
    expect(
      (convertedTag[0].configuration_blocks[0].configs[0] as any)['{{output}}']
    ).toHaveProperty('hosts');

    expect(
      (convertedTag[0].configuration_blocks[0].configs[0] as any)['{{output}}'].hosts.length
    ).toBe(2);
  });

  it('should use helper function to convert config object to users yaml', async () => {
    const convertedTag = tagsLib.jsonConfigToUserYaml([
      {
        id: 'fsdfsdfs',
        color: '#DD0A73',
        configuration_blocks: [
          {
            type: 'filebeat.inputs',
            description: 'sdfsdf',
            configs: [{ paths: ['sdfsfsdf'], something: 'here' }],
          },
        ],
        last_updated: '2018-09-04T15:52:08.983Z',
      } as any,
    ]);

    expect(convertedTag.length).toBe(1);
    expect(convertedTag[0].configuration_blocks.length).toBe(1);
    expect(convertedTag[0].configuration_blocks[0].configs.length).toBe(1);
    expect(convertedTag[0].configuration_blocks[0].configs[0]).not.toHaveProperty('something');
    expect(convertedTag[0].configuration_blocks[0].configs[0]).toHaveProperty('other');

    expect(convertedTag[0].configuration_blocks[0].configs[0].other).toBe('something: here\n');
  });

  it('should use helper function to convert config object to users yaml with empty `other`', async () => {
    const convertedTag = tagsLib.jsonConfigToUserYaml([
      {
        id: 'fsdfsdfs',
        color: '#DD0A73',
        configuration_blocks: [
          {
            type: 'filebeat.inputs',
            description: undefined,
            configs: [{ paths: ['sdfsfsdf'] }],
          },
        ],
        last_updated: '2018-09-04T15:52:08.983Z',
      } as any,
    ]);

    expect(convertedTag.length).toBe(1);
    expect(convertedTag[0].configuration_blocks.length).toBe(1);
    expect(convertedTag[0].configuration_blocks[0].configs.length).toBe(1);
    expect(convertedTag[0].configuration_blocks[0].configs[0]).not.toHaveProperty('something');
    expect(convertedTag[0].configuration_blocks[0].configs[0]).toHaveProperty('other');

    expect(convertedTag[0].configuration_blocks[0].configs[0].other).toBe('');
  });
});
