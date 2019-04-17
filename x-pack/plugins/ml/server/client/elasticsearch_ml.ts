/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallClusterOptions } from 'src/legacy/core_plugins/elasticsearch';
// import { CallClusterWithRequest, CallClusterOptions } from 'src/legacy/core_plugins/elasticsearch';
// import { Request } from 'src/legacy/server/kbn_server';
// import { Client as ESClient } from 'elasticsearch';

// TODO
// this lib should similar to, or inherit from (if possible?) kibana/src/legacy/core_plugins/elasticsearch/index.d.ts
// where all possible options are available
// it should replace CallWithRequestType in kibana/x-pack/plugins/ml/server/models/annotation_service/annotation.ts
/* eslint-disable */
export interface CallWithRequestType {
  (endpoint: string, params: any, options?: CallClusterOptions): Promise<any>;
}
