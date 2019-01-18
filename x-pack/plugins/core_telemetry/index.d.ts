/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface IVisState {
  type: string;
}

export interface IVisualization {
  visState: string;
}

export interface ISavedObjectDoc {
  _id: string;
  _source: {
    visualization: IVisualization;
    type: 'visualization';
  };
}

export interface IESQueryResponse {
  hits: {
    hits: ISavedObjectDoc[];
  };
}

export interface ITaskInstance {
  state: {
    runs: number;
    stats: any;
  };
  error?: any;
}

export interface IHapiServer {
  taskManager: {
    registerTaskDefinitions: (opts: any) => void;
    schedule: (opts: any) => Promise<void>;
    fetch: (
      opts: any
    ) => Promise<{
      docs: ITaskInstance[];
    }>;
  };
  plugins: {
    xpack_main: any;
    elasticsearch: {
      getCluster: (
        cluster: string
      ) => {
        callWithInternalUser: () => Promise<IESQueryResponse>;
      };
    };
  };
  usage: {
    collectorSet: {
      register: (collector: any) => void;
      makeUsageCollector: (collectorOpts: any) => void;
    };
  };
  config: () => {
    get: (prop: string) => any;
  };
}
