/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { configBlockSchemas } from '../../../common/config_schemas';
import { translateConfigSchema } from '../../../common/config_schemas_translations_map';
import { ConfigBlocksLib } from '../configuration_blocks';
import { MemoryConfigBlocksAdapter } from './../adapters/configuration_blocks/memory_config_blocks_adapter';

describe('Tags Client Domain Lib', () => {
  let lib: ConfigBlocksLib;

  beforeEach(async () => {
    lib = new ConfigBlocksLib(
      new MemoryConfigBlocksAdapter([]),
      translateConfigSchema(configBlockSchemas)
    );
  });

  it('should use helper function to convert users yaml in tag to config object', async () => {
    const convertedBlocks = lib.userConfigsToJson([
      {
        id: 'foo',
        tag: 'basic',
        last_updated: parseInt(new Date().toISOString(), 10),
        type: 'filebeat.inputs',
        description: 'string',
        config: {
          paths: ['adad/adasd'],
          other: "something: 'here'",
        },
      },
    ]);

    expect(convertedBlocks.length).toBe(1);
    expect(convertedBlocks[0]).toHaveProperty('config');
    expect(convertedBlocks[0].config).not.toHaveProperty('other');
    expect(convertedBlocks[0].config).toHaveProperty('something');
    expect(convertedBlocks[0].config.something).toBe('here');
  });

  it('should use helper function to convert user config to json with undefined `other`', async () => {
    const convertedTag = lib.userConfigsToJson([
      {
        id: 'foo',
        tag: 'basic',
        last_updated: parseInt(new Date().toISOString(), 10),
        type: 'filebeat.inputs',
        description: 'sdfsdf',
        config: {
          paths: ['sdfsfsdf'],
          other: undefined,
        },
      },
    ]);

    expect(convertedTag.length).toBe(1);
    expect(convertedTag[0]).not.toHaveProperty('other');
  });

  it('should use helper function to convert users yaml in tag to config object, where empty other leads to no other fields saved', async () => {
    const convertedTag = lib.userConfigsToJson([
      {
        id: 'foo',
        tag: 'basic',
        last_updated: parseInt(new Date().toISOString(), 10),
        type: 'filebeat.inputs',
        description: 'string',
        config: {
          paths: ['adad/adasd'],
          other: `
          sdfsdf: "foo"
          `,
        },
      },
    ]);

    expect(convertedTag.length).toBe(1);
    expect(convertedTag[0].config).not.toHaveProperty('other');
    expect(convertedTag[0].config.sdfsdf).toBe('foo');
  });

  it('should convert tokenized fields to JSON', async () => {
    const convertedTag = lib.userConfigsToJson([
      {
        id: 'foo',
        tag: 'basic',
        last_updated: parseInt(new Date().toISOString(), 10),
        type: 'output',
        description: 'something',
        config: {
          _sub_type: 'console',
          hosts: ['esefsfsgg', 'drgdrgdgr'],
          username: '',
          password: '',
        },
      },
    ]);

    expect(convertedTag.length).toBe(1);
    expect(convertedTag[0].config).toHaveProperty('_sub_type');
    expect(convertedTag[0].config).toHaveProperty('hosts');
    expect(convertedTag[0].config.hosts.length).toBe(2);
  });

  it('should use helper function to convert config object to users yaml', async () => {
    const convertedTag = lib.jsonConfigToUserYaml([
      {
        id: 'foo',
        tag: 'basic',
        last_updated: parseInt(new Date().toISOString(), 10),
        type: 'filebeat.inputs',
        description: 'sdfsdf',
        config: {
          paths: ['sdfsfsdf'],
          something: 'here',
        },
      },
    ]);

    expect(convertedTag.length).toBe(1);
    expect(convertedTag[0].config).not.toHaveProperty('something');
    expect(convertedTag[0].config).toHaveProperty('other');
    expect(convertedTag[0].config.other).toBe('something: here\n');
  });

  it('should use helper function to convert config object to users yaml with empty `other`', async () => {
    const convertedTag = lib.jsonConfigToUserYaml([
      {
        id: 'foo',
        tag: 'basic',
        last_updated: parseInt(new Date().toISOString(), 10),
        type: 'filebeat.inputs',
        description: undefined,
        config: {
          paths: ['sdfsfsdf'],
        },
      },
    ]);

    expect(convertedTag.length).toBe(1);
    expect(convertedTag[0].config).not.toHaveProperty('something');
    expect(convertedTag[0].config).toHaveProperty('other');
    expect(convertedTag[0].config.other).toBe('');
  });
});
