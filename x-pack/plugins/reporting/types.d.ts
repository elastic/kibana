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
  expose: () => void;
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
  clone?: (tags: string[]) => Logger;
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

export interface TimeRangeParams {
  timezone: string;
  min: Date | string | number;
  max: Date | string | number;
}

type PostPayloadState = Partial<{
  state: {
    query: any;
    sort: any[];
    columns: string[]; // TODO
  };
}>;

// retain POST payload data, needed for async
interface JobParamPostPayload extends PostPayloadState {
  timerange: TimeRangeParams;
}

// params that come into a request
export interface JobParams {
  savedObjectType: string;
  savedObjectId: string;
  isImmediate: boolean;
  post?: JobParamPostPayload;
  panel?: any; // has to be resolved by the request handler
  visType?: string; // has to be resolved by the request handler
}

export interface JobDocPayload {
  basePath?: string;
  forceNow?: string;
  headers?: Record<string, string>;
  jobParams: JobParams;
  relativeUrl?: string;
  timeRange?: any;
  title: string;
  urls?: string[];
  type?: string | null; // string if completed job; null if incomplete job;
  objects?: string | null; // string if completed job; null if incomplete job;
}

export interface JobDocOutput {
  content: string; // encoded content
  contentType: string;
}

export interface JobDoc {
  jobtype: string;
  output: JobDocOutput;
  payload: JobDocPayload;
  status: string; // completed, failed, etc
}

export interface JobSource {
  _id: string;
  _source: JobDoc;
}

/*
 * A snake_cased field is the only significant difference in structure of
 * JobDocOutputExecuted vs JobDocOutput.
 *
 * JobDocOutput is the structure of the object returned by getDocumentPayload
 *
 * data in the _source fields of the
 * Reporting index.
 *
 * The ESQueueWorker internals have executed job objects returned with this
 * structure. See `_formatOutput` in reporting/server/lib/esqueue/worker.js
 */
export interface JobDocOutputExecuted {
  content_type: string; // vs `contentType` above
  content: string | null; // defaultOutput is null
  max_size_reached: boolean;
  size: number;
}

export interface ESQueueWorker {
  on: (event: string, handler: any) => void;
}

export type ESQueueWorkerExecuteFn = (job: JobDoc, cancellationToken: any) => void;

export interface ExportType {
  jobType: string;
  createJobFactory: any;
  executeJobFactory: (server: KbnServer) => ESQueueWorkerExecuteFn;
}

export interface ESQueueWorkerOptions {
  kibanaName: string;
  kibanaId: string;
  interval: number;
  intervalErrorMultiplier: number;
}

export interface ESQueueInstance {
  registerWorker: (
    jobtype: string,
    workerFn: any,
    workerOptions: ESQueueWorkerOptions
  ) => ESQueueWorker;
}
