/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compareFrameGroup, createFrameGroup, createFrameGroupID } from './frame_group';
import { createStackFrameMetadata } from './profiling';

const nonSymbolizedFrameGroups = [
  createFrameGroup(
    createStackFrameMetadata({
      FileID: '0x0123456789ABCDEF',
      AddressOrLine: 102938,
    })
  ),
  createFrameGroup(
    createStackFrameMetadata({
      FileID: '0x0123456789ABCDEF',
      AddressOrLine: 1234,
    })
  ),
  createFrameGroup(
    createStackFrameMetadata({
      FileID: '0x0102030405060708',
      AddressOrLine: 1234,
    })
  ),
];

const elfSymbolizedFrameGroups = [
  createFrameGroup(
    createStackFrameMetadata({
      FileID: '0x0123456789ABCDEF',
      FunctionName: 'strlen()',
    })
  ),
  createFrameGroup(
    createStackFrameMetadata({
      FileID: '0xFEDCBA9876543210',
      FunctionName: 'strtok()',
    })
  ),
  createFrameGroup(
    createStackFrameMetadata({
      FileID: '0xFEDCBA9876543210',
      FunctionName: 'main()',
    })
  ),
];

const symbolizedFrameGroups = [
  createFrameGroup(
    createStackFrameMetadata({
      ExeFileName: 'chrome',
      SourceFilename: 'strlen()',
      FunctionName: 'strlen()',
    })
  ),
  createFrameGroup(
    createStackFrameMetadata({
      ExeFileName: 'dockerd',
      SourceFilename: 'main()',
      FunctionName: 'createTask()',
    })
  ),
  createFrameGroup(
    createStackFrameMetadata({
      ExeFileName: 'oom_reaper',
      SourceFilename: 'main()',
      FunctionName: 'crash()',
    })
  ),
];

describe('Frame group operations', () => {
  describe('check if a non-symbolized frame group is', () => {
    test('less than another non-symbolized frame group', () => {
      expect(compareFrameGroup(nonSymbolizedFrameGroups[1], nonSymbolizedFrameGroups[0])).toEqual(
        -1
      );
    });

    test('equal to another non-symbolized frame group', () => {
      expect(compareFrameGroup(nonSymbolizedFrameGroups[0], nonSymbolizedFrameGroups[0])).toEqual(
        0
      );
    });

    test('greater than another non-symbolized frame group', () => {
      expect(compareFrameGroup(nonSymbolizedFrameGroups[1], nonSymbolizedFrameGroups[2])).toEqual(
        1
      );
    });

    test('less than an ELF-symbolized frame group', () => {
      expect(compareFrameGroup(nonSymbolizedFrameGroups[1], elfSymbolizedFrameGroups[0])).toEqual(
        -1
      );
    });

    test('less than a symbolized frame group', () => {
      expect(compareFrameGroup(nonSymbolizedFrameGroups[1], symbolizedFrameGroups[0])).toEqual(-1);
    });
  });

  describe('check if an ELF-symbolized frame group is', () => {
    test('less than another ELF-symbolized frame group', () => {
      expect(compareFrameGroup(elfSymbolizedFrameGroups[0], elfSymbolizedFrameGroups[1])).toEqual(
        -1
      );
    });

    test('equal to another ELF-symbolized frame group', () => {
      expect(compareFrameGroup(elfSymbolizedFrameGroups[0], elfSymbolizedFrameGroups[0])).toEqual(
        0
      );
    });

    test('greater than another ELF-symbolized frame group', () => {
      expect(compareFrameGroup(elfSymbolizedFrameGroups[1], elfSymbolizedFrameGroups[0])).toEqual(
        1
      );
    });

    test('greater than a non-symbolized frame group', () => {
      expect(compareFrameGroup(elfSymbolizedFrameGroups[0], nonSymbolizedFrameGroups[0])).toEqual(
        1
      );
    });

    test('less than a symbolized frame group', () => {
      expect(compareFrameGroup(elfSymbolizedFrameGroups[2], symbolizedFrameGroups[0])).toEqual(-1);
    });
  });

  describe('check if a symbolized frame group is', () => {
    test('less than another symbolized frame group', () => {
      expect(compareFrameGroup(symbolizedFrameGroups[0], symbolizedFrameGroups[1])).toEqual(-1);
    });

    test('equal to another symbolized frame group', () => {
      expect(compareFrameGroup(symbolizedFrameGroups[0], symbolizedFrameGroups[0])).toEqual(0);
    });

    test('greater than another symbolized frame group', () => {
      expect(compareFrameGroup(symbolizedFrameGroups[1], symbolizedFrameGroups[0])).toEqual(1);
    });

    test('greater than a non-symbolized frame group', () => {
      expect(compareFrameGroup(symbolizedFrameGroups[0], nonSymbolizedFrameGroups[0])).toEqual(1);
    });

    test('greater than an ELF-symbolized frame group', () => {
      expect(compareFrameGroup(symbolizedFrameGroups[0], elfSymbolizedFrameGroups[2])).toEqual(1);
    });
  });

  describe('check serialization for', () => {
    test('non-symbolized frame', () => {
      expect(createFrameGroupID(nonSymbolizedFrameGroups[0])).toEqual(
        'empty;0x0123456789ABCDEF;102938'
      );
    });

    test('non-symbolized ELF frame', () => {
      expect(createFrameGroupID(elfSymbolizedFrameGroups[0])).toEqual(
        'elf;0x0123456789ABCDEF;strlen()'
      );
    });

    test('symbolized frame', () => {
      expect(createFrameGroupID(symbolizedFrameGroups[0])).toEqual('full;chrome;strlen();strlen()');
    });
  });
});
