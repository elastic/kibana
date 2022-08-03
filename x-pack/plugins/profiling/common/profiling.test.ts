/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createFrameGroup,
  createStackFrameMetadata,
  compareFrameGroup,
  defaultGroupBy,
  FrameType,
  getCalleeFunction,
  getCalleeSource,
  hashFrameGroup,
} from './profiling';

describe('Stack frame metadata operations', () => {
  test('metadata has executable and function names', () => {
    const metadata = createStackFrameMetadata({
      ExeFileName: 'chrome',
      FrameType: FrameType.Native,
      FunctionName: 'strlen()',
    });
    expect(getCalleeFunction(metadata)).toEqual('chrome: strlen()');
  });

  test('metadata only has executable name', () => {
    const metadata = createStackFrameMetadata({
      ExeFileName: 'promtail',
      FrameType: FrameType.Native,
    });
    expect(getCalleeFunction(metadata)).toEqual('promtail');
  });

  test('metadata has executable name but no function name or source line', () => {
    const metadata = createStackFrameMetadata({
      ExeFileName: 'promtail',
      FrameType: FrameType.Native,
    });
    expect(getCalleeSource(metadata)).toEqual('promtail+0x0');
  });

  test('metadata has no executable name, function name, or source line', () => {
    const metadata = createStackFrameMetadata({});
    expect(getCalleeSource(metadata)).toEqual('<unsymbolized>');
  });

  test('metadata has source name but no source line', () => {
    const metadata = createStackFrameMetadata({
      ExeFileName: 'dockerd',
      FrameType: FrameType.Native,
      SourceFilename: 'dockerd',
      FunctionOffset: 0x183a5b0,
    });
    expect(getCalleeSource(metadata)).toEqual('dockerd+0x0');
  });

  test('metadata has source name and function offset', () => {
    const metadata = createStackFrameMetadata({
      ExeFileName: 'python3.9',
      FrameType: FrameType.Python,
      FunctionName: 'PyDict_GetItemWithError',
      FunctionOffset: 2567,
      SourceFilename: '/build/python3.9-RNBry6/python3.9-3.9.2/Objects/dictobject.c',
      SourceLine: 1456,
    });
    expect(getCalleeSource(metadata)).toEqual(
      '/build/python3.9-RNBry6/python3.9-3.9.2/Objects/dictobject.c#2567'
    );
  });

  test('metadata has source name but no function offset', () => {
    const metadata = createStackFrameMetadata({
      ExeFileName: 'agent',
      FrameType: FrameType.Native,
      FunctionName: 'runtime.mallocgc',
      SourceFilename: 'runtime/malloc.go',
    });
    expect(getCalleeSource(metadata)).toEqual('runtime/malloc.go');
  });
});

describe('Frame group operations', () => {
  test('check if a frame group is less than another', () => {
    const a = createFrameGroup({ ExeFileName: 'chrome' });
    const b = createFrameGroup({ ExeFileName: 'dockerd' });
    expect(compareFrameGroup(a, b)).toEqual(-1);
  });

  test('check if a frame group is greater than another', () => {
    const a = createFrameGroup({ ExeFileName: 'oom_reaper' });
    const b = createFrameGroup({ ExeFileName: 'dockerd' });
    expect(compareFrameGroup(a, b)).toEqual(1);
  });

  test('check if frame groups are equal', () => {
    const a = createFrameGroup({ AddressOrLine: 1234 });
    const b = createFrameGroup({ AddressOrLine: 1234 });
    expect(compareFrameGroup(a, b)).toEqual(0);
  });

  test('check serialized non-symbolized frame', () => {
    const metadata = createStackFrameMetadata({
      FileID: '0x0123456789ABCDEF',
      AddressOrLine: 102938,
    });
    expect(hashFrameGroup(defaultGroupBy(metadata))).toEqual(
      '{"AddressOrLine":102938,"ExeFileName":"","FileID":"0x0123456789ABCDEF","FunctionName":"","SourceFilename":""}'
    );
  });

  test('check serialized non-symbolized ELF frame', () => {
    const metadata = createStackFrameMetadata({
      FunctionName: 'strlen()',
      FileID: '0x0123456789ABCDEF',
    });
    expect(hashFrameGroup(defaultGroupBy(metadata))).toEqual(
      '{"AddressOrLine":0,"ExeFileName":"","FileID":"0x0123456789ABCDEF","FunctionName":"strlen()","SourceFilename":""}'
    );
  });

  test('check serialized symbolized frame', () => {
    const metadata = createStackFrameMetadata({
      ExeFileName: 'chrome',
      SourceFilename: 'strlen()',
      FunctionName: 'strlen()',
    });
    expect(hashFrameGroup(defaultGroupBy(metadata))).toEqual(
      '{"AddressOrLine":0,"ExeFileName":"chrome","FileID":"","FunctionName":"strlen()","SourceFilename":"strlen()"}'
    );
  });
});
