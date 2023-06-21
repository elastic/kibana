/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFrameGroupID } from './frame_group';

const nonSymbolizedTests = [
  {
    params: {
      fileID: '0x0123456789ABCDEF',
      addressOrLine: 102938,
      exeFilename: '',
      sourceFilename: '',
      functionName: '',
    },
    expected: 'empty;0x0123456789ABCDEF;102938',
  },
  {
    params: {
      fileID: '0x0123456789ABCDEF',
      addressOrLine: 1234,
      exeFilename: 'libpthread',
      sourceFilename: '',
      functionName: '',
    },
    expected: 'empty;0x0123456789ABCDEF;1234',
  },
];

const elfSymbolizedTests = [
  {
    params: {
      fileID: '0x0123456789ABCDEF',
      addressOrLine: 0,
      exeFilename: 'libc',
      sourceFilename: '',
      functionName: 'strlen()',
    },
    expected: 'elf;libc;strlen()',
  },
  {
    params: {
      fileID: '0xFEDCBA9876543210',
      addressOrLine: 8888,
      exeFilename: 'libc',
      sourceFilename: '',
      functionName: 'strtok()',
    },
    expected: 'elf;libc;strtok()',
  },
];

const symbolizedTests = [
  {
    params: {
      fileID: '',
      addressOrLine: 0,
      exeFilename: 'chrome',
      sourceFilename: 'strlen()',
      functionName: 'strlen()',
    },
    expected: 'full;chrome;strlen();strlen()',
  },
  {
    params: {
      fileID: '',
      addressOrLine: 0,
      exeFilename: 'oom_reaper',
      sourceFilename: 'main()',
      functionName: 'crash()',
    },
    expected: 'full;oom_reaper;crash();main()',
  },
  {
    params: {
      fileID: '',
      addressOrLine: 75,
      exeFilename: 'oom_reaper',
      sourceFilename: '/code/functionsimsearch/learning/simhashweightslossfunctor.hpp',
      functionName: 'crash()',
    },
    expected: 'full;oom_reaper;crash();learning/simhashweightslossfunctor.hpp',
  },
];

describe('Frame group operations', () => {
  describe('check serialization for', () => {
    test('non-symbolized frame', () => {
      for (const test of nonSymbolizedTests) {
        const frameGroupID = createFrameGroupID(
          test.params.fileID,
          test.params.addressOrLine,
          test.params.exeFilename,
          test.params.sourceFilename,
          test.params.functionName
        );
        expect(frameGroupID).toEqual(test.expected);
      }
    });

    test('non-symbolized ELF frame', () => {
      for (const test of elfSymbolizedTests) {
        const frameGroupID = createFrameGroupID(
          test.params.fileID,
          test.params.addressOrLine,
          test.params.exeFilename,
          test.params.sourceFilename,
          test.params.functionName
        );
        expect(frameGroupID).toEqual(test.expected);
      }
    });

    test('symbolized frame', () => {
      for (const test of symbolizedTests) {
        const frameGroupID = createFrameGroupID(
          test.params.fileID,
          test.params.addressOrLine,
          test.params.exeFilename,
          test.params.sourceFilename,
          test.params.functionName
        );
        expect(frameGroupID).toEqual(test.expected);
      }
    });
  });
});
