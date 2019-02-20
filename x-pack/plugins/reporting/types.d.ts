/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface UiSettings {
  get: (value: string) => string;
}

type SavedObjectClient = any;

// these types shoud be in core kibana and are only here temporarily
export interface KbnServer {
  info: { protocol: string };
  config: () => ConfigObject;
  plugins: Record<string, any>;
  route: any;
  log: any;
  fieldFormatServiceFactory: (uiConfig: any) => any;
  savedObjects: {
    getScopedSavedObjectsClient: (
      fakeRequest: { headers: object; getBasePath: () => string }
    ) => SavedObjectClient;
  };
  uiSettingsServiceFactory: (
    { savedObjectsClient }: { savedObjectsClient: SavedObjectClient }
  ) => UiSettings;
}

export interface ExportTypeDefinition {
  id: string;
  name: string;
  jobType: string;
  jobContentExtension: string;
  createJobFactory: () => any;
  executeJobFactory: () => any;
  validLicenses: string[];
}

export interface ExportTypesRegistry {
  register: (exportTypeDefinition: ExportTypeDefinition) => void;
}

export interface ConfigObject {
  get: (path?: string) => any;
}

export interface Size {
  width: number;
  height: number;
}

export interface Logger {
  debug: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  clone: (tags: string[]) => Logger;
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

export interface CryptoFactory {
  decrypt: (headers?: Record<string, string>) => string;
}

export interface ReportingJob {
  headers?: Record<string, string>;
  basePath?: string;
  urls?: string[];
  relativeUrl?: string;
  forceNow?: string;
  timeRange?: any;
  objects?: [any];
}

// params that come into a request
export interface JobParams {
  savedObjectType: string;
  savedObjectId: string;
  isImmediate: boolean;
  panel?: any; // has to be resolved by the request handler
  visType?: string; // has to be resolved by the request handler
}

export interface JobDocPayload {
  basePath: string;
  headers: string;
  objects: string | null; // string if completed job; null if incomplete job
  title: string;
  type: string;
  jobParams: JobParams;
}

export interface JobDocOutput {
  content: string; // encoded content
  contentType: string;
  headers: any;
  size?: number;
  statusCode: number;
}

export interface JobDoc {
  jobtype: string;
  output: JobDocOutput;
  payload: JobDocPayload;
  status: string; // completed, failed, etc
}
