/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createStackFrameID,
  createStackFrameMetadata,
  FrameType,
  getAddressFromStackFrameID,
  getCalleeFunction,
  getCalleeSource,
  getFileIDFromStackFrameID,
} from './profiling';

describe('Stack frame operations', () => {
  test('decode stack frame ID', () => {
    const frameID = createStackFrameID('ABCDEFGHIJKLMNOPQRSTUw', 123456789);
    expect(getAddressFromStackFrameID(frameID)).toEqual(123456789);
    expect(getFileIDFromStackFrameID(frameID)).toEqual('ABCDEFGHIJKLMNOPQRSTUw');
  });
});

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
    expect(getCalleeSource(metadata)).toEqual('dockerd');
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
      '/build/python3.9-RNBry6/python3.9-3.9.2/Objects/dictobject.c#1456'
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
