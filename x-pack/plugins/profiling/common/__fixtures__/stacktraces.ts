/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStackFrameID } from '../profiling';

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
  J = 'ZNiZco1zgh0nJI6hPllMaQ==',
  K = 'abl5r8Vvvb2Y7NaDZW1QLQ==',
}

enum addressOrLine {
  A = 26278522,
  B = 6712518,
  C = 105806025,
  D = 105806854,
  E = 107025202,
  F = 107044169,
  G = 18353156,
  H = 3027,
  I = 5201,
  J = 67384048,
  K = 8888,
}

const frameID: Record<string, string> = {
  A: createStackFrameID(fileID.A, addressOrLine.A),
  B: createStackFrameID(fileID.B, addressOrLine.B),
  C: createStackFrameID(fileID.C, addressOrLine.C),
  D: createStackFrameID(fileID.D, addressOrLine.D),
  E: createStackFrameID(fileID.E, addressOrLine.C),
  F: createStackFrameID(fileID.E, addressOrLine.D),
  G: createStackFrameID(fileID.E, addressOrLine.E),
  H: createStackFrameID(fileID.E, addressOrLine.F),
  I: createStackFrameID(fileID.E, addressOrLine.G),
  J: createStackFrameID(fileID.F, addressOrLine.H),
  K: createStackFrameID(fileID.F, addressOrLine.I),
  L: createStackFrameID(fileID.F, addressOrLine.J),
  M: createStackFrameID(fileID.F, addressOrLine.K),
  N: createStackFrameID(fileID.G, addressOrLine.G),
  O: createStackFrameID(fileID.H, addressOrLine.H),
  P: createStackFrameID(fileID.I, addressOrLine.I),
  Q: createStackFrameID(fileID.F, addressOrLine.A),
  R: createStackFrameID(fileID.E, addressOrLine.B),
  S: createStackFrameID(fileID.E, addressOrLine.C),
};

export const events = new Map([
  [stackTraceID.A, 16],
  [stackTraceID.B, 9],
  [stackTraceID.C, 7],
  [stackTraceID.D, 5],
  [stackTraceID.E, 2],
  [stackTraceID.F, 1],
]);

export const stackTraces = new Map([
  [
    stackTraceID.A,
    {
      FileIDs: [fileID.D, fileID.C, fileID.B, fileID.A],
      AddressOrLines: [addressOrLine.D, addressOrLine.C, addressOrLine.B, addressOrLine.A],
      FrameIDs: [frameID.D, frameID.C, frameID.B, frameID.A],
      Types: [3, 3, 3, 3],
    },
  ],
  [
    stackTraceID.B,
    {
      FileIDs: [fileID.E, fileID.E, fileID.E, fileID.E, fileID.E],
      AddressOrLines: [
        addressOrLine.G,
        addressOrLine.F,
        addressOrLine.E,
        addressOrLine.D,
        addressOrLine.C,
      ],
      FrameIDs: [frameID.I, frameID.H, frameID.G, frameID.F, frameID.E],
      Types: [3, 3, 3, 3, 3],
    },
  ],
  [
    stackTraceID.C,
    {
      FileIDs: [fileID.F, fileID.F, fileID.F, fileID.F],
      AddressOrLines: [addressOrLine.K, addressOrLine.J, addressOrLine.I, addressOrLine.H],
      FrameIDs: [frameID.M, frameID.L, frameID.K, frameID.J],
      Types: [3, 3, 3, 3],
    },
  ],
  [
    stackTraceID.D,
    {
      FileIDs: [fileID.I, fileID.H, fileID.G],
      AddressOrLines: [addressOrLine.I, addressOrLine.H, addressOrLine.G],
      FrameIDs: [frameID.P, frameID.O, frameID.N],
      Types: [3, 8, 8],
    },
  ],
  [
    stackTraceID.E,
    {
      FileIDs: [fileID.F, fileID.F, fileID.F],
      AddressOrLines: [addressOrLine.K, addressOrLine.J, addressOrLine.I],
      FrameIDs: [frameID.M, frameID.L, frameID.K],
      Types: [3, 3, 3],
    },
  ],
  [
    stackTraceID.F,
    {
      FileIDs: [fileID.E, fileID.E],
      AddressOrLines: [addressOrLine.F, addressOrLine.E],
      FrameIDs: [frameID.H, frameID.G],
      Types: [3, 3],
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

export const stackFrames = new Map([
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

export const executables = new Map([
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
