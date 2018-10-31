/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export interface KbnServer {
  config: () => ConfigObject;
}

export interface ConfigObject {
  get: (path: string) => any;
}

export interface Size {
  width: number;
  height: number;
}

export interface Logger {
  debug: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
}

export interface ViewZoomWidthHeight {
  zoom: number;
  width: number;
  height: number;
}

export type EvalArgs = any[];
export type EvalFn<T> = ((...evalArgs: EvalArgs) => T);

export interface EvaluateOptions {
  fn: EvalFn<any>;
  args: EvalArgs; // Arguments to be passed into the function defined by fn.
}

export interface ElementPosition {
  boundingClientRect: {
    // modern browsers support x/y, but older ones don't
    top: number;
    left: number;
    width: number;
    height: number;
  };
  scroll: {
    x: number;
    y: number;
  };
}

export interface HeadlessElementInfo {
  position: ElementPosition;
}

export interface ConditionalHeaders {
  headers: Record<string, string>;
  conditions: ConditionalHeadersConditions;
}

export interface ConditionalHeadersConditions {
  protocol: string;
  hostname: string;
  port: number;
  basePath: string;
}
