/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFrameGroup, createFrameGroupID } from './frame_group';

const nonSymbolizedFrameGroups = [
  createFrameGroup('0x0123456789ABCDEF', 102938, '', '', ''),
  createFrameGroup('0x0123456789ABCDEF', 1234, '', '', ''),
  createFrameGroup('0x0102030405060708', 1234, '', '', ''),
];

const elfSymbolizedFrameGroups = [
  createFrameGroup('0x0123456789ABCDEF', 0, 'libc', '', 'strlen()'),
  createFrameGroup('0xFEDCBA9876543210', 0, 'libc', '', 'strtok()'),
  createFrameGroup('0xFEDCBA9876543210', 0, 'myapp', '', 'main()'),
];

const symbolizedFrameGroups = [
  createFrameGroup('', 0, 'chrome', 'strlen()', 'strlen()'),
  createFrameGroup('', 0, 'dockerd', 'main()', 'createTask()'),
  createFrameGroup('', 0, 'oom_reaper', 'main()', 'crash()'),
];

describe('Frame group operations', () => {
  describe('check serialization for', () => {
    test('non-symbolized frame', () => {
      expect(createFrameGroupID(nonSymbolizedFrameGroups[0])).toEqual(
        'empty;0x0123456789ABCDEF;102938'
      );
    });

    test('non-symbolized ELF frame', () => {
      expect(createFrameGroupID(elfSymbolizedFrameGroups[0])).toEqual('elf;libc;strlen()');
    });

    test('symbolized frame', () => {
      expect(createFrameGroupID(symbolizedFrameGroups[0])).toEqual('full;chrome;strlen();strlen()');
    });
  });
});
