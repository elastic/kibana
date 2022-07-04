/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createCallerCalleeDiagram,
  createCallerCalleeIntermediateNode,
  fromCallerCalleeIntermediateNode,
} from './callercallee';
import { createStackFrameMetadata, hashFrameGroup } from './profiling';

enum stackTraceID {
  A = 'yU2Oct2ct0HkxJ7-pRcPkg==',
  B = 'Xt8aKN70PDXpMDLCOmojzQ==',
  C = '8OauxYq2WK4_tBqM4xkIwA==',
  D = 'nQWGdRxvqVjwlLmQWH1Phw==',
  E = '2KciEEWALlol3b6x95PHcw==',
  F = 'BxRgiXa4h9Id6BjdPPHK8Q==',
}

enum fileID {
  A = 'Ncujji3wC1nL73TTEyFBhA==',
  B = 'T2vdys5d7j85az1aP86zCg==',
  C = 'jMaTVVjYv7cecd0C4HguGw==',
  D = 'RLkjnlfcvSJN2Wph9WUuOQ==',
  E = 'gnEsgxvvEODj6iFYMQWYlA==',
  F = 'Gf4xoLc8QuAHU49Ch_CFOA==',
  G = 'ZCOCZlls7r2cbG1HchkbVg==',
  H = 'Og7kGWGe9qiCunkaXDffHQ==',
  I = 'WAE6T1TeDsjDMOuwX4Ynxg==',
}

enum frameID {
  A = 'ZNiZco1zgh0nJI6hPllMaQAAAAABkPp6',
  B = 'abl5r8Vvvb2Y7NaDZW1QLQAAAAAAZmzG',
  C = 'gnEsgxvvEODj6iFYMQWYlAAAAAAGTnjJ',
  D = 'gnEsgxvvEODj6iFYMQWYlAAAAAAGTnwG',
  E = 'gnEsgxvvEODj6iFYMQWYlAAAAAAGYRMy',
  F = 'gnEsgxvvEODj6iFYMQWYlAAAAAAGYV1J',
  G = 'gnEsgxvvEODj6iFYMQWYlAAAAAAGEz_F',
  H = 'Gf4xoLc8QuAHU49Ch_CFOAAAAAAABjhI',
  I = 'Gf4xoLc8QuAHU49Ch_CFOAAAAAAAAcit',
  J = 'Gf4xoLc8QuAHU49Ch_CFOAAAAAAAAfiT',
  K = 'Gf4xoLc8QuAHU49Ch_CFOAAAAAAAAf7J',
  L = 'ZCOCZlls7r2cbG1HchkbVgAAAAABGAwE',
  M = 'Og7kGWGe9qiCunkaXDffHQAAAAAAAAvT',
  N = 'WAE6T1TeDsjDMOuwX4YnxgAAAAAAABRR',
  O = 'Gf4xoLc8QuAHU49Ch_CFOAAAAAAABloA',
  P = 'Gf4xoLc8QuAHU49Ch_CFOAAAAAABV97Q',
  Q = 'Gf4xoLc8QuAHU49Ch_CFOAAAAAABV9CG',
  R = 'gnEsgxvvEODj6iFYMQWYlAAAAAAEBDLw',
  S = 'gnEsgxvvEODj6iFYMQWYlAAAAAAD05_D',
}

const events = new Map([
  [stackTraceID.A, 16],
  [stackTraceID.B, 9],
  [stackTraceID.C, 7],
  [stackTraceID.D, 5],
  [stackTraceID.E, 2],
  [stackTraceID.F, 1],
]);

const stackTraces = new Map([
  [
    stackTraceID.A,
    {
      FileID: [fileID.A, fileID.B, fileID.C, fileID.D],
      FrameID: [frameID.A, frameID.A, frameID.A, frameID.B],
      Type: [3, 3, 3, 3],
    },
  ],
  [
    stackTraceID.B,
    {
      FileID: [fileID.E, fileID.E, fileID.E, fileID.E, fileID.E],
      FrameID: [frameID.C, frameID.D, frameID.E, frameID.F, frameID.G],
      Type: [3, 3, 3, 3, 3],
    },
  ],
  [
    stackTraceID.C,
    {
      FileID: [fileID.F, fileID.F, fileID.F, fileID.F],
      FrameID: [frameID.H, frameID.I, frameID.J, frameID.K],
      Type: [3, 3, 3, 3],
    },
  ],
  [
    stackTraceID.D,
    {
      FileID: [fileID.G, fileID.H, fileID.I],
      FrameID: [frameID.L, frameID.M, frameID.N],
      Type: [3, 8, 8],
    },
  ],
  [
    stackTraceID.E,
    {
      FileID: [fileID.F, fileID.F, fileID.F],
      FrameID: [frameID.O, frameID.P, frameID.Q],
      Type: [3, 3, 3],
    },
  ],
  [
    stackTraceID.F,
    {
      FileID: [fileID.E, fileID.E],
      FrameID: [frameID.R, frameID.S],
      Type: [3, 3],
    },
  ],
]);

const defaultStackFrame = {
  FileName: '',
  FunctionName: '',
  FunctionOffset: 0,
  LineNumber: 0,
  SourceType: 0,
};

const stackFrames = new Map([
  [
    frameID.A,
    {
      FileName: 'ThreadPoolExecutor.java',
      FunctionName: 'java.lang.Runnable java.util.concurrent.ThreadPoolExecutor.getTask()',
      FunctionOffset: 26,
      LineNumber: 1061,
      SourceType: 5,
    },
  ],
  [
    frameID.B,
    { FileName: '', FunctionName: 'sock_sendmsg', FunctionOffset: 0, LineNumber: 0, SourceType: 0 },
  ],
  [frameID.C, defaultStackFrame],
  [frameID.D, defaultStackFrame],
  [frameID.E, defaultStackFrame],
  [frameID.F, defaultStackFrame],
  [frameID.G, defaultStackFrame],
  [frameID.H, defaultStackFrame],
  [frameID.I, defaultStackFrame],
  [frameID.J, defaultStackFrame],
  [frameID.K, defaultStackFrame],
  [
    frameID.L,
    { FileName: '', FunctionName: 'udp_sendmsg', FunctionOffset: 0, LineNumber: 0, SourceType: 0 },
  ],
  [frameID.M, defaultStackFrame],
  [frameID.N, defaultStackFrame],
  [frameID.O, defaultStackFrame],
  [frameID.P, defaultStackFrame],
  [frameID.Q, defaultStackFrame],
  [frameID.R, defaultStackFrame],
  [frameID.S, defaultStackFrame],
]);

const executables = new Map([
  [fileID.A, { FileName: '' }],
  [fileID.B, { FileName: '' }],
  [fileID.C, { FileName: '' }],
  [fileID.D, { FileName: 'libglapi.so.0.0.0' }],
  [fileID.E, { FileName: '' }],
  [fileID.F, { FileName: '' }],
  [fileID.G, { FileName: '' }],
  [fileID.H, { FileName: '' }],
  [fileID.I, { FileName: '' }],
]);

describe('Caller-callee operations', () => {
  test('1', () => {
    const parentFrame = createStackFrameMetadata({
      FileID: '6bc50d345244d5956f93a1b88f41874d',
      FrameType: 3,
      AddressOrLine: 971740,
      FunctionName: 'epoll_wait',
      SourceID: 'd670b496cafcaea431a23710fb5e4f58',
      SourceLine: 30,
      ExeFileName: 'libc-2.26.so',
      Index: 1,
    });
    const parent = createCallerCalleeIntermediateNode(parentFrame, 10);

    const childFrame = createStackFrameMetadata({
      FileID: '8d8696a4fd51fa88da70d3fde138247d',
      FrameType: 3,
      AddressOrLine: 67000,
      FunctionName: 'epoll_poll',
      SourceID: 'f0a7901dcefed6cc8992a324b9df733c',
      SourceLine: 150,
      ExeFileName: 'auditd',
      Index: 0,
    });
    const child = createCallerCalleeIntermediateNode(childFrame, 10);

    const root = createCallerCalleeIntermediateNode(createStackFrameMetadata(), 10);
    root.callees.set(hashFrameGroup(child.frameGroup), child);
    root.callees.set(hashFrameGroup(parent.frameGroup), parent);

    const graph = fromCallerCalleeIntermediateNode(root);

    // Modify original frames to verify graph does not contain references
    parent.samples = 30;
    child.samples = 20;

    expect(graph.Callees[0].Samples).toEqual(10);
    expect(graph.Callees[1].Samples).toEqual(10);
  });

  test('2', () => {
    const root = createCallerCalleeDiagram(events, stackTraces, stackFrames, executables);
    expect(root.Samples).toEqual(40);
  });
});
